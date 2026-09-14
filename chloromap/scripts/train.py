#!/usr/bin/env python
"""Train a model.

Usage:
    python scripts/train.py --config configs/baseline.yaml
    python scripts/train.py --config configs/final.yaml
    python scripts/train.py --config configs/baseline.yaml --epochs 15 --batch-size 8 --seed 7
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
from torch.utils.data import DataLoader, WeightedRandomSampler  # noqa: E402

from chloromap.config import TrainConfig  # noqa: E402
from chloromap.data.dataset import CropDiseaseDataset  # noqa: E402
from chloromap.data.transforms import get_train_transforms, get_val_transforms  # noqa: E402
from chloromap.training.trainer import Trainer  # noqa: E402


def _has_classes(d: Path) -> bool:
    return d.exists() and any(p.is_dir() for p in d.iterdir())


def build_datasets(cfg: TrainConfig):
    """Return (train_ds, val_ds, train_dir, val_dir).

    Prefers the prepared processed split (../data/processed/train|val).
    Falls back to the raw data dir if no split exists.
    """
    data_dir = Path(cfg.data_dir).resolve()

    # Try a few candidate locations for the processed split, covering
    # both <data>/raw/plantvillage and shallow <data>/raw layouts.
    candidates = [
        data_dir.parent / "processed",
        data_dir.parent.parent / "processed",
    ]
    proc_train = proc_val = None
    for base in candidates:
        t, v = base / "train", base / "val"
        if _has_classes(t) and _has_classes(v):
            proc_train, proc_val = t, v
            break

    if proc_train is not None:
        train_dir, val_dir = proc_train, proc_val
    else:
        train_dir = val_dir = data_dir

    if train_dir == val_dir:
        print("WARNING: no processed split found — using raw data as both train and val. "
              "Run scripts/prepare_dataset.py first for a real split.")

    # Deterministic class mapping derived from the dataset directory order
    class_to_idx = {
        d.name: i for i, d in enumerate(sorted([p for p in Path(data_dir).iterdir() if p.is_dir()]))
    }

    train_ds = CropDiseaseDataset(
        train_dir,
        transform=get_train_transforms(cfg.image_size, cfg.augmentation, cfg.erasing),
        class_to_idx=class_to_idx,
    )
    val_ds = CropDiseaseDataset(
        val_dir,
        transform=get_val_transforms(cfg.image_size),
        class_to_idx=class_to_idx,
    )
    return train_ds, val_ds, train_dir, val_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Train the disease classifier")
    parser.add_argument("--config", default="configs/baseline.yaml")
    parser.add_argument("--resume", action="store_true", help="unused placeholder")
    parser.add_argument("--device", default=None)
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--output", type=str, default=None, help="override output_dir")
    parser.add_argument("--reports-dir", type=str, default=None)
    parser.add_argument("--data-dir", type=str, default=None)
    parser.add_argument("--warmup-epochs", type=int, default=None)
    parser.add_argument("--mixup-alpha", type=float, default=None)
    parser.add_argument("--erasing", type=float, default=None)
    parser.add_argument("--balanced-sampling", dest="balanced_sampling",
                        action=argparse.BooleanOptionalAction, default=None)
    args = parser.parse_args()

    cfg = TrainConfig.from_yaml(args.config)
    if args.device:
        cfg.device = args.device
    if args.epochs:
        cfg.epochs = args.epochs
    if args.batch_size:
        cfg.batch_size = args.batch_size
    if args.seed:
        cfg.seed = args.seed
    if args.output:
        cfg.output_dir = args.output
    if args.reports_dir:
        cfg.reports_dir = args.reports_dir
    if args.data_dir:
        cfg.data_dir = args.data_dir
    if args.warmup_epochs is not None:
        cfg.warmup_epochs = args.warmup_epochs
    if args.mixup_alpha is not None:
        cfg.mixup_alpha = args.mixup_alpha
    if args.erasing is not None:
        cfg.erasing = args.erasing
    if args.balanced_sampling is not None:
        cfg.balanced_sampling = args.balanced_sampling

    train_ds, val_ds, train_dir, val_dir = build_datasets(cfg)

    if len(train_ds) == 0:
        print(f"ERROR: no training images found under {train_dir}")
        return 1
    if len(val_ds) == 0:
        print(f"ERROR: no validation images found under {val_dir}")
        return 1

    # Sync class mapping and num_classes
    cfg.num_classes = train_ds.num_classes
    class_names = train_ds.classes
    print(f"Train images: {len(train_ds)} | Val images: {len(val_ds)} | Classes: {len(class_names)}")

    # --- class imbalance handling ---
    # Inverse-frequency class weights, computed from the training split only.
    counts = np.bincount([label for _, label in train_ds.samples], minlength=train_ds.num_classes)
    inv_freq = 1.0 / np.maximum(counts, 1.0)
    class_weights = (inv_freq / inv_freq.sum()).astype(float)

    if cfg.loss.lower() in {"weighted_crossentropyloss", "weighted_cross_entropy", "focal", "focalloss"}:
        if cfg.class_weights is None:
            cfg.class_weights = class_weights.tolist()
            print("Inverse-frequency class weights applied for weighted/focal loss.")
        else:
            print("Using explicit class_weights from config.")

    # --- data loaders ---
    sampler = None
    if cfg.balanced_sampling:
        sample_weights = torch.from_numpy(np.asarray([class_weights[lbl] for _, lbl in train_ds.samples])).double()
        sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
        print(f"Balanced sampling: WeightedRandomSampler over {len(train_ds)} samples "
              f"(class weight range {class_weights.min():.3f}-{class_weights.max():.3f}).")

    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size, num_workers=cfg.num_workers,
                              sampler=sampler, shuffle=sampler is None, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=cfg.batch_size, num_workers=cfg.num_workers,
                            shuffle=False, pin_memory=True)

    # Save class mapping (deterministic reference for inference)
    labels_path = Path(cfg.reports_dir) / "final" / "labels.json"
    train_ds.save_class_mapping(labels_path)

    trainer = Trainer(cfg)
    trainer.setup(train_loader, val_loader, class_names)
    result = trainer.train()
    trainer.save_experiment_report(
        {k: v for k, v in result.items() if k.startswith("best_")}
    )
    print(f"\nDone. Best validation Macro-F1: {trainer.best_macro_f1:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())