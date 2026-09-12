"""
Training engine for AgriSmart AI crop disease detection.
Implements transfer learning using EfficientNet-B0 with Automatic Mixed Precision (AMP FP16)
and Macro-F1 validation checkpointing.

CRITICAL SIH ARCHITECTURAL DATASET PROTOCOL:
- TRAINING: Strictly uses PlantVillage training data (plantvillage/train or 85% random split).
- MODEL SELECTION: Strictly uses PlantVillage validation data (plantvillage/val or 15% random split).
- PROHIBITED: The SIH held-out field test set (field_test/) and internal debug test splits must NEVER
  be accessed, scanned, or used for model training, hyperparameter tuning, or early stopping.
"""

import argparse
import json
import os
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

CURRENT_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = CURRENT_DIR.parent
PROJECT_ROOT = ML_SERVICE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml_service.config import config
from ml_service.training.dataset import (
    discover_classes,
    get_transforms,
    validate_dataset_structure,
    PlantVillageDataset,
    SUPPORTED_IMAGE_EXTENSIONS,
)


def set_seed(seed: int = 42):
    """Sets deterministic random seeds across all libraries."""
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
    except ImportError:
        pass


def prepare_data_splits(
    data_root: Path,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Tuple[Path, int]], List[Tuple[Path, int]], List[str], Dict[str, int]]:
    """
    Splits PlantVillage image directory deterministically into train and validation sets.
    If explicit train/val subfolders exist, loads them directly.
    """
    path_str = str(data_root).lower()
    if "field_test" in path_str or "held_out" in path_str:
        raise ValueError(
            "CRITICAL SIH VIOLATION: The held-out field test set must NEVER be used for training or validation."
        )
    if "internal_test" in path_str:
        raise ValueError(
            "CRITICAL SIH VIOLATION: The internal test set cannot be supplied as a training source."
        )

    classes = discover_classes(data_root)
    if not classes:
        raise ValueError(f"No class subfolders found in dataset root: {data_root}")

    class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
    train_samples: List[Tuple[Path, int]] = []
    val_samples: List[Tuple[Path, int]] = []

    has_train = (data_root / "train").exists() and (data_root / "train").is_dir()
    has_val = (data_root / "val").exists() and (data_root / "val").is_dir()

    if has_train and has_val:
        # Load explicit train and val directories
        for cls_name in classes:
            idx = class_to_idx[cls_name]
            t_dir = data_root / "train" / cls_name
            v_dir = data_root / "val" / cls_name
            if t_dir.exists():
                for f in t_dir.iterdir():
                    if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                        train_samples.append((f, idx))
            if v_dir.exists():
                for f in v_dir.iterdir():
                    if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                        val_samples.append((f, idx))
    else:
        # Deterministic 85/15 split from flat class folders
        rng = random.Random(seed)
        for class_name in classes:
            class_idx = class_to_idx[class_name]
            class_dir = data_root / class_name
            images = [
                f
                for f in class_dir.iterdir()
                if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
            ]
            images.sort()
            rng.shuffle(images)

            num_val = max(1, int(len(images) * val_ratio)) if len(images) > 5 else 0
            val_imgs = images[:num_val]
            train_imgs = images[num_val:]

            for img in train_imgs:
                train_samples.append((img, class_idx))
            for img in val_imgs:
                val_samples.append((img, class_idx))

    return train_samples, val_samples, classes, class_to_idx


def train_model(
    data_root: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    epochs: Optional[int] = None,
    batch_size: Optional[int] = None,
    lr: Optional[float] = None,
    seed: int = 42,
) -> Dict:
    """
    Executes end-to-end model training with PyTorch AMP FP16 on NVIDIA RTX 3050.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader
    from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support
    import torchvision.models as models

    set_seed(seed)

    data_dir = data_root or config.plantvillage_dir
    save_dir = output_dir or (config.model_checkpoint_path.parent)
    save_dir.mkdir(parents=True, exist_ok=True)

    num_epochs = epochs or config.epochs
    bs = batch_size or config.batch_size
    learning_rate = lr or config.learning_rate

    # Guard against accidental field_test directory usage
    if "field_test" in str(data_dir).lower() or "held_out" in str(data_dir).lower():
        raise ValueError(
            "CRITICAL SIH VIOLATION: The held-out field test set must NEVER be used for training or validation."
        )

    # Validate dataset structure
    report = validate_dataset_structure(data_dir)
    if not report.is_ready_for_training:
        print("\n[ERROR] PlantVillage dataset is not ready for training:")
        for issue in report.issues:
            print(f"  - {issue}")
        for sug in report.suggestions:
            print(f"  * {sug}")
        raise RuntimeError(f"PlantVillage dataset validation failed for: {data_dir}")

    print(f"\n========================================================")
    print(f"  AgriSmart AI — PlantVillage Model Training Pipeline")
    print(f"========================================================")
    print(f"Training Dataset : PlantVillage Train Split ({data_dir})")
    print(f"Validation Target: PlantVillage Validation Split")
    print(f"Total Images     : {report.total_images}")
    print(f"Total Classes    : {report.num_classes}")
    print(f"Target Device    : {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print(f"Batch Size       : {bs}")
    print(f"Epochs           : {num_epochs}\n")

    # Prepare splits
    train_samples, val_samples, class_names, class_to_idx = prepare_data_splits(
        data_dir, val_ratio=config.val_split_ratio, seed=seed
    )
    print(f"Train Samples    : {len(train_samples)}")
    print(f"Val Samples      : {len(val_samples)}")

    # Build DataLoaders
    train_ds = PlantVillageDataset(train_samples, transform=get_transforms(config.image_size, is_train=True))
    val_ds = PlantVillageDataset(val_samples, transform=get_transforms(config.image_size, is_train=False))

    train_loader = DataLoader(
        train_ds, batch_size=bs, shuffle=True, num_workers=config.num_workers, pin_memory=True
    )
    val_loader = DataLoader(
        val_ds, batch_size=bs, shuffle=False, num_workers=config.num_workers, pin_memory=True
    )

    # Build EfficientNet-B0 Architecture
    weights = models.EfficientNet_B0_Weights.DEFAULT if config.pretrained else None
    model = models.efficientnet_b0(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=config.dropout, inplace=True),
        nn.Linear(in_features, len(class_names)),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # Optimizer, Loss & Scheduler
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=learning_rate, weight_decay=config.weight_decay
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=num_epochs, eta_min=1e-6
    )

    use_amp = config.mixed_precision and device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    best_macro_f1 = 0.0
    best_accuracy = 0.0
    patience_counter = 0
    best_checkpoint_path = save_dir / "best_crop_model.pth"
    history = []

    for epoch in range(1, num_epochs + 1):
        # Training Loop
        model.train()
        total_train_loss = 0.0
        for images, labels in train_loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            optimizer.zero_grad()
            with torch.amp.autocast("cuda", enabled=use_amp):
                outputs = model(images)
                loss = criterion(outputs, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            total_train_loss += loss.item() * images.size(0)

        train_loss = total_train_loss / len(train_loader.dataset)
        scheduler.step()

        # Validation Loop (PlantVillage Validation Split)
        model.eval()
        val_preds = []
        val_targets = []
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device, non_blocking=True)
                with torch.amp.autocast("cuda", enabled=use_amp):
                    outputs = model(images)
                    preds = torch.argmax(outputs, dim=1)

                val_preds.extend(preds.cpu().numpy().tolist())
                val_targets.extend(labels.numpy().tolist())

        val_acc = float(accuracy_score(val_targets, val_preds))
        val_macro_f1 = float(f1_score(val_targets, val_preds, average="macro", zero_division=0))

        p, r, f1, _ = precision_recall_fscore_support(
            val_targets, val_preds, labels=list(range(len(class_names))), zero_division=0
        )

        epoch_stats = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_accuracy": round(val_acc, 4),
            "val_macro_f1": round(val_macro_f1, 4),
        }
        history.append(epoch_stats)

        print(
            f"Epoch [{epoch:02d}/{num_epochs:02d}] "
            f"Train Loss: {train_loss:.4f} | "
            f"Val Acc: {val_acc * 100:.2f}% | "
            f"Val Macro-F1: {val_macro_f1:.4f}"
        )

        # Checkpoint Selection based on Validation Macro-F1
        if val_macro_f1 > best_macro_f1:
            best_macro_f1 = val_macro_f1
            best_accuracy = val_acc
            patience_counter = 0

            torch.save(
                {
                    "epoch": epoch,
                    "architecture": config.architecture,
                    "num_classes": len(class_names),
                    "class_names": class_names,
                    "class_to_idx": class_to_idx,
                    "image_size": config.image_size,
                    "macro_f1": val_macro_f1,
                    "accuracy": val_acc,
                    "training_dataset": "plantvillage_train",
                    "validation_dataset": "plantvillage_val",
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "normalization": {
                        "mean": [0.485, 0.456, 0.406],
                        "std": [0.229, 0.224, 0.225],
                    },
                },
                best_checkpoint_path,
            )
            print(f"  --> Saved new best checkpoint (Macro-F1: {val_macro_f1:.4f}) to {best_checkpoint_path}")
        else:
            patience_counter += 1
            if patience_counter >= config.early_stopping_patience:
                print(f"\n[Early Stopping Triggered] Validation Macro-F1 did not improve for {config.early_stopping_patience} consecutive epochs.")
                break

    # Save training history JSON
    history_file = config.reports_dir / "training_history.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "training_dataset": "plantvillage_train",
                "validation_dataset": "plantvillage_val",
                "best_macro_f1": round(best_macro_f1, 4),
                "best_accuracy": round(best_accuracy, 4),
                "epochs_completed": len(history),
                "history": history,
            },
            f,
            indent=2,
        )

    print(f"\n[✓] Training complete! Best Validation Macro-F1: {best_macro_f1:.4f}")
    print(f"[✓] Training history saved to: {history_file}")
    return {"best_macro_f1": best_macro_f1, "checkpoint_path": str(best_checkpoint_path)}


def main():
    parser = argparse.ArgumentParser(description="Train AgriSmart PlantVillage Crop Disease Classifier")
    parser.add_argument("--data-root", type=str, default=None, help="Path to PlantVillage dataset root")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save model checkpoints")
    parser.add_argument("--epochs", type=int, default=None, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=None, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=None, help="Initial learning rate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    data_root = Path(args.data_root) if args.data_root else None
    output_dir = Path(args.output_dir) if args.output_dir else None

    train_model(
        data_root=data_root,
        output_dir=output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()