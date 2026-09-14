"""Trainer — standard training loop with AMP, checkpointing, and logging."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ..config import TrainConfig
from ..evaluation.metrics import compute_metrics
from ..models.efficientnet import (
    count_trainable_params,
    freeze_backbone,
    get_parameter_groups,
    unfreeze_from_layer,
)
from ..models.factory import build_model
from ..seed import seed_everything
from .losses import build_loss
from .schedulers import build_scheduler

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover
    def tqdm(it, **kw):
        return it


def _resolve_device(requested: str) -> torch.device:
    if requested == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(requested)


def mixup_data(
    x: torch.Tensor,
    y: torch.Tensor,
    alpha: float,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    """Mixup (Zhang et al., 2018). Returns mixed_x, y_a, y_b, lam."""
    if alpha > 0:
        lam = float(np.random.beta(alpha, alpha))
    else:
        lam = 1.0
    index = torch.randperm(x.size(0), device=x.device)
    mixed_x = lam * x + (1.0 - lam) * x[index]
    return mixed_x, y, y[index], lam


def mixup_criterion(
    criterion: nn.Module,
    pred: torch.Tensor,
    y_a: torch.Tensor,
    y_b: torch.Tensor,
    lam: float,
) -> torch.Tensor:
    return lam * criterion(pred, y_a) + (1.0 - lam) * criterion(pred, y_b)


class Trainer:
    def __init__(self, config: TrainConfig):
        self.cfg = config
        seed_everything(config.seed)
        self.device = _resolve_device(config.device)
        self.model: Optional[nn.Module] = None
        self.optimizer = None
        self.scheduler = None
        self.loss_fn = None
        self.history: list[dict] = []
        self.best_macro_f1 = -1.0
        self.best_state = None

    # ------------------------------------------------------------------
    def setup(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        class_names: list[str],
    ) -> None:
        cfg = self.cfg
        self.num_classes = len(class_names)
        self.class_names = class_names
        self.train_loader = train_loader
        self.val_loader = val_loader

        self.model = build_model(
            cfg.model_name, num_classes=self.num_classes, pretrained=cfg.pretrained
        )

        if cfg.freeze_backbone:
            freeze_backbone(self.model)
        elif cfg.unfreeze_from_layer:
            # freeze everything then unfreeze selected layers
            freeze_backbone(self.model)
            unfreeze_from_layer(self.model, cfg.unfreeze_from_layer)

        self.model.to(self.device)

        self.loss_fn = build_loss(
            cfg.loss,
            self.num_classes,
            cfg.label_smoothing,
            gamma=cfg.focal_gamma,
            class_weights=cfg.class_weights,
        ).to(self.device)
        self.use_mixup = cfg.mixup_alpha > 0

        trainable = count_trainable_params(self.model)
        head_lr = cfg.learning_rate
        backbone_lr = cfg.learning_rate * 0.1 if cfg.unfreeze_from_layer else cfg.learning_rate

        if cfg.optimizer.lower() == "adamw":
            groups = get_parameter_groups(self.model, backbone_lr=backbone_lr, head_lr=head_lr)
            self.optimizer = torch.optim.AdamW(
                groups if groups else self.model.parameters(),
                lr=head_lr,
                weight_decay=cfg.weight_decay,
            )
        elif cfg.optimizer.lower() in {"sgd", "momentum"}:
            self.optimizer = torch.optim.SGD(
                self.model.parameters(), lr=head_lr, weight_decay=cfg.weight_decay, momentum=0.9
            )
        else:
            raise ValueError(f"Unknown optimizer: {cfg.optimizer}")

        self.scheduler = build_scheduler(
            self.optimizer, cfg.scheduler, epochs=cfg.epochs,
            T_max=cfg.T_max, warmup_epochs=cfg.warmup_epochs,
        )

        self.amp_enabled = self.use_amp and self.device.type == "cuda"

        print(f"Device:     {self.device}")
        print(f"AMP:        {'enabled' if self.amp_enabled else 'disabled'}")
        print(f"Trainable:  {trainable} / {sum(p.numel() for p in self.model.parameters())} params")

    # ------------------------------------------------------------------
    @property
    def use_amp(self) -> bool:
        return self.cfg.use_amp and torch.cuda.is_available()

    # ------------------------------------------------------------------
    def _run_epoch(self, loader: DataLoader, train: bool, epoch: int) -> dict:
        if train:
            self.model.train()
        else:
            self.model.eval()

        running_loss = 0.0
        running_correct = 0
        total = 0
        logits_all = []
        labels_all = []
        start = time.time()

        amp_ctx = torch.autocast("cuda", enabled=self.amp_enabled)
        loader_iter = tqdm(loader, desc=("train" if train else "val  "),
                           leave=False, ncols=100, unit="batch")
        for images, labels in loader_iter:
            images = images.to(self.device, non_blocking=True)
            labels = labels.to(self.device, non_blocking=True)

            labels_metric = labels
            if train and self.use_mixup:
                images, y_a, y_b, lam = mixup_data(images, labels, self.cfg.mixup_alpha)
                with amp_ctx:
                    logits = self.model(images)
                    loss = mixup_criterion(self.loss_fn, logits, y_a, y_b, lam)
            else:
                with amp_ctx:
                    logits = self.model(images)
                    loss = self.loss_fn(logits, labels)

            if train:
                self.optimizer.zero_grad(set_to_none=True)
                loss.backward()
                self.optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = logits.detach().argmax(dim=1)
            running_correct += (preds == labels_metric).sum().item()
            total += images.size(0)

            logits_all.append(logits.detach())
            labels_all.append(labels_metric.detach())

            loader_iter.set_postfix(loss=f"{loss.item():.4f}", acc=f"{(preds == labels_metric).float().mean().item():.3f}")

        if self.scheduler is not None and train and self.cfg.scheduler != "plateau":
            self.scheduler.step()

        logits_cat = torch.cat(logits_all, dim=0)
        labels_cat = torch.cat(labels_all, dim=0)
        metrics = compute_metrics(logits_cat.cpu().numpy(), labels_cat.cpu().numpy())

        lr = self.optimizer.param_groups[0]["lr"] if self.optimizer else 0.0
        return {
            "epoch": epoch,
            "loss": running_loss / total,
            "accuracy": running_correct / total,
            "macro_f1": metrics["macro_f1"],
            "macro_precision": metrics["macro_precision"],
            "macro_recall": metrics["macro_recall"],
            "lr": lr,
            "duration_s": time.time() - start,
        }

    # ------------------------------------------------------------------
    def train(self) -> dict:
        cfg = self.cfg
        print(f"\nExperiment: {cfg.experiment_id} ({cfg.experiment_name or 'no name'})")
        print(f"Model: {cfg.model_name} | classes: {self.num_classes} | "
              f"epochs: {cfg.epochs} | batch: {cfg.batch_size}")
        print(f"Optimizer: {cfg.optimizer} lr={cfg.learning_rate} wd={cfg.weight_decay} "
              f"| scheduler: {cfg.scheduler} | stage: {cfg.stage}")

        best_info = {}
        for epoch in range(1, cfg.epochs + 1):
            train_metrics = self._run_epoch(self.train_loader, train=True, epoch=epoch)

            val_metrics = self._run_epoch(self.val_loader, train=False, epoch=epoch)
            val_metrics["loss"] = val_metrics.pop("loss")
            metrics = dict(train_metrics)
            metrics.update({f"val_{k}": v for k, v in val_metrics.items()})

            self.history.append(metrics)
            print(
                f"Epoch {epoch:02d}/{cfg.epochs} | train_loss {metrics['loss']:.4f} "
                f"| train_acc {metrics['accuracy']:.4f} | val_loss {val_metrics['loss']:.4f} "
                f"| val_acc {val_metrics['accuracy']:.4f} | val_mf1 {val_metrics['macro_f1']:.4f} "
                f"| lr {metrics['lr']:.2e} | {metrics['duration_s']:.1f}s"
            )

            if val_metrics["macro_f1"] > self.best_macro_f1:
                self.best_macro_f1 = val_metrics["macro_f1"]
                self.best_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                best_info = {
                    "best_epoch": epoch,
                    "best_validation_macro_f1": self.best_macro_f1,
                    "best_validation_accuracy": val_metrics["accuracy"],
                }
                print(f"  -> new best Macro-F1 {self.best_macro_f1:.4f}")

        # Restore best state, then save
        self.model.load_state_dict(self.best_state)
        self.save_checkpoint(best_info)
        return {
            "experiment_id": cfg.experiment_id,
            "history": self.history,
            **best_info,
        }

    # ------------------------------------------------------------------
    def save_checkpoint(self, best_info: dict) -> Path:
        cfg = self.cfg
        out_dir = Path(cfg.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / "best_model.pth"

        checkpoint = {
            "experiment_id": cfg.experiment_id,
            "experiment_name": cfg.experiment_name,
            "model_name": cfg.model_name,
            "num_classes": self.num_classes,
            "class_names": self.class_names,
            "state_dict": self.best_state,
            "image_size": cfg.image_size,
            "augmentation": cfg.augmentation,
            "erasing": cfg.erasing,
            "mixup_alpha": cfg.mixup_alpha,
            "balanced_sampling": cfg.balanced_sampling,
            "seed": cfg.seed,
            "epochs": cfg.epochs,
            "warmup_epochs": cfg.warmup_epochs,
            "batch_size": cfg.batch_size,
            "optimizer": cfg.optimizer,
            "learning_rate": cfg.learning_rate,
            "weight_decay": cfg.weight_decay,
            "scheduler": cfg.scheduler,
            "loss": cfg.loss,
            "focal_gamma": cfg.focal_gamma,
            "label_smoothing": cfg.label_smoothing,
            "stage": cfg.stage,
            "freeze_backbone": cfg.freeze_backbone,
            "unfreeze_from_layer": cfg.unfreeze_from_layer,
            "use_amp": self.amp_enabled,
            "device": str(self.device),
            "best_epoch": best_info.get("best_epoch"),
            "validation_macro_f1": best_info.get("best_validation_macro_f1"),
            "validation_accuracy": best_info.get("best_validation_accuracy"),
            "history": self.history,
        }
        # Save the full checkpoint (contains the state dict under key "state_dict")
        torch.save(checkpoint, path)
        print(f"Checkpoint saved: {path}")
        return path

    # ------------------------------------------------------------------
    def save_experiment_report(self, best_info: dict) -> Path:
        cfg = self.cfg
        out = Path(cfg.reports_dir) / "experiments" / f"{cfg.experiment_id}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "experiment_id": cfg.experiment_id,
            "model": cfg.model_name,
            "pretrained": cfg.pretrained,
            "image_size": cfg.image_size,
            "batch_size": cfg.batch_size,
            "epochs": cfg.epochs,
            "optimizer": cfg.optimizer,
            "learning_rate": cfg.learning_rate,
            "weight_decay": cfg.weight_decay,
            "scheduler": cfg.scheduler,
            "warmup_epochs": cfg.warmup_epochs,
            "augmentation": cfg.augmentation,
            "erasing": cfg.erasing,
            "mixup_alpha": cfg.mixup_alpha,
            "balanced_sampling": cfg.balanced_sampling,
            "loss": cfg.loss,
            "focal_gamma": cfg.focal_gamma,
            "label_smoothing": cfg.label_smoothing,
            "seed": cfg.seed,
            "stage": cfg.stage,
            "freeze_backbone": cfg.freeze_backbone,
            "device": str(self.device),
            "dataset": {"num_classes": self.num_classes, "classes": self.class_names},
            **best_info,
        }
        with out.open("w") as fh:
            json.dump(report, fh, indent=2)
        print(f"Experiment report: {out}")
        return out