"""
Evaluation engine for AgriSmart AI crop disease models.
Evaluates model checkpoints against PlantVillage validation, PlantVillage internal debug test,
or SIH held-out field-condition test sets.

CRITICAL SIH EVALUATION PROTOCOL:
- PlantVillage validation metrics and SIH Held-Out Field Test metrics are two completely distinct evaluations.
- Internal PlantVillage splits must NEVER be reported as or confused with SIH Held-Out Field Test metrics.
- Every metric report strictly records the dataset_type and dataset_name metadata.
"""

import argparse
import json
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
    PlantVillageDataset,
    SUPPORTED_IMAGE_EXTENSIONS,
)

DATASET_TYPE_CHOICES = {
    "validation": "plantvillage_validation",
    "internal_test": "plantvillage_internal_test",
    "field_test": "sih_held_out_field_test",
}


def evaluate_dataset(
    dataset_dir: Path,
    checkpoint_path: Path,
    output_dir: Optional[Path] = None,
    eval_type: str = "validation",
    dataset_label: Optional[str] = None,
) -> Dict:
    """
    Evaluates a saved checkpoint on a target directory split and saves documented reports.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader
    import torchvision.models as models
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        confusion_matrix,
        f1_score,
        precision_recall_fscore_support,
    )

    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at: {checkpoint_path}")
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Evaluation dataset directory not found at: {dataset_dir}")

    mapped_dataset_type = DATASET_TYPE_CHOICES.get(eval_type.lower(), "plantvillage_validation")

    if dataset_label is None:
        if mapped_dataset_type == "sih_held_out_field_test":
            dataset_label = "SIH Held-Out Field-Condition Test Set"
        elif mapped_dataset_type == "plantvillage_internal_test":
            dataset_label = "PlantVillage Internal Debug Test Split"
        else:
            dataset_label = "PlantVillage Validation Split"

    reports_dir = output_dir or config.reports_dir
    reports_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load checkpoint and metadata
    ckpt = torch.load(checkpoint_path, map_location=device)
    class_names = ckpt.get("class_names")
    if not class_names:
        class_names = discover_classes(dataset_dir)

    num_classes = len(class_names)
    class_to_idx = ckpt.get("class_to_idx", {name: i for i, name in enumerate(class_names)})

    # Initialize architecture
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=config.dropout, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    state_dict = ckpt.get("model_state_dict", ckpt)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    # Discover images in evaluation directory
    samples: List[Tuple[Path, int]] = []
    for cls in class_names:
        cls_path = dataset_dir / cls
        if cls_path.exists():
            for f in cls_path.iterdir():
                if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                    samples.append((f, class_to_idx[cls]))

    if not samples:
        raise ValueError(
            f"No valid image samples matching checkpoint classes found in: {dataset_dir}"
        )

    ds = PlantVillageDataset(samples, transform=get_transforms(config.image_size, is_train=False))
    loader = DataLoader(
        ds, batch_size=config.batch_size, shuffle=False, num_workers=config.num_workers
    )

    y_true = []
    y_pred = []

    print(f"\n========================================================")
    print(f"  AgriSmart AI — Model Evaluation Engine")
    print(f"========================================================")
    print(f"Dataset Type   : {mapped_dataset_type.upper()}")
    print(f"Dataset Label  : {dataset_label}")
    print(f"Dataset Path   : {dataset_dir}")
    print(f"Total Samples  : {len(samples)}")
    print(f"Total Classes  : {num_classes}")
    print(f"Checkpoint     : {checkpoint_path}\n")

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            outputs = model(images)
            preds = torch.argmax(outputs, dim=1)

            y_true.extend(labels.numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())

    # Compute metrics
    acc = float(accuracy_score(y_true, y_pred))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    p, r, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(num_classes)), zero_division=0
    )

    per_class_metrics = {}
    for i, name in enumerate(class_names):
        per_class_metrics[name] = {
            "precision": round(float(p[i]), 4),
            "recall": round(float(r[i]), 4),
            "f1_score": round(float(f1[i]), 4),
            "support": int(support[i]),
        }

    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes))).tolist()
    clf_report = classification_report(
        y_true, y_pred, target_names=class_names, zero_division=0, output_dict=True
    )

    results = {
        "dataset_name": dataset_dir.name,
        "dataset_type": mapped_dataset_type,
        "dataset_label": dataset_label,
        "dataset_path": str(dataset_dir),
        "model_checkpoint": str(checkpoint_path),
        "num_samples": len(samples),
        "num_classes": num_classes,
        "class_names": class_names,
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm,
        "classification_report": clf_report,
    }

    # Save JSON report
    safe_label = mapped_dataset_type
    report_file = reports_dir / f"evaluation_{safe_label}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[✓] Saved evaluation report to: {report_file}")

    # Generate Confusion Matrix heatmap if matplotlib available
    try:
        import matplotlib.pyplot as plt

        plt.figure(figsize=(14, 12))
        plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
        plt.title(f"Confusion Matrix — {dataset_label}\n(Macro-F1: {macro_f1:.4f} | Accuracy: {acc*100:.2f}%)")
        plt.colorbar()
        tick_marks = np.arange(len(class_names))
        plt.xticks(tick_marks, class_names, rotation=90, fontsize=7)
        plt.yticks(tick_marks, class_names, fontsize=7)
        plt.tight_layout()
        plt.ylabel("True Class")
        plt.xlabel("Predicted Class")

        cm_png = reports_dir / f"confusion_matrix_{safe_label}.png"
        plt.savefig(cm_png, dpi=200, bbox_inches="tight")
        plt.close()
        print(f"[✓] Saved confusion matrix heatmap to: {cm_png}")
    except Exception as e:
        print(f"[!] Notice: Plotting skipped ({e})")

    print(f"\n[SUMMARY RESULTS]:")
    print(f"  - Dataset Type              : {mapped_dataset_type}")
    print(f"  - Primary Metric (Macro-F1) : {macro_f1:.4f}")
    print(f"  - Overall Accuracy          : {acc * 100:.2f}%")
    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate AgriSmart Crop Disease Classifier")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to evaluation image directory")
    parser.add_argument("--checkpoint", type=str, default=str(config.model_checkpoint_path), help="Path to checkpoint .pth")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save evaluation reports")
    parser.add_argument(
        "--eval-type",
        type=str,
        choices=["validation", "internal_test", "field_test"],
        default="validation",
        help="Evaluation category: 'validation' (PlantVillage val), 'internal_test' (debug), or 'field_test' (SIH judging)",
    )
    parser.add_argument("--label", type=str, default=None, help="Optional custom label for evaluation run")
    args = parser.parse_args()

    evaluate_dataset(
        dataset_dir=Path(args.data_dir),
        checkpoint_path=Path(args.checkpoint),
        output_dir=Path(args.output_dir) if args.output_dir else None,
        eval_type=args.eval_type,
        dataset_label=args.label,
    )


if __name__ == "__main__":
    main()