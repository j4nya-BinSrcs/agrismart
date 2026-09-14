"""Full evaluation of a checkpoint → JSON metrics + human-readable report."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from ..data.dataset import CropDiseaseDataset
from ..data.transforms import get_val_transforms
from ..models.factory import build_model
from .confusion_matrix import plot_confusion_matrix
from .metrics import compute_metrics


def evaluate_checkpoint(
    checkpoint: str | Path,
    val_dir: Optional[str | Path] = None,
    device: str = "auto",
    seed: int = 0,
) -> dict:
    """Run evaluation of a saved checkpoint on a validation directory.

    Returns a dict of all metrics and per-class results.
    """
    from ..seed import seed_everything
    if seed:
        seed_everything(seed)

    ckpt_path = Path(checkpoint)
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)

    class_names = ckpt.get("class_names") or ckpt.get("classes")
    if class_names is None:
        raise ValueError("Checkpoint does not define class_names — cannot evaluate.")

    num_classes = len(class_names)
    image_size = ckpt.get("image_size", 224)
    model_name = ckpt.get("model_name", "tf_efficientnetv2_s")

    model = build_model(model_name, num_classes=num_classes, pretrained=False)
    state = ckpt.get("state_dict")
    if state is None:
        # try loading raw state dict key directly
        state = ckpt
    model.load_state_dict(state)

    dev = torch.device("cuda" if (device == "auto" and torch.cuda.is_available()) else device)
    model.to(dev)
    model.eval()

    # --- dataset ---
    if val_dir is not None:
        class_to_idx = {c: i for i, c in enumerate(class_names)}
        ds = CropDiseaseDataset(val_dir, transform=get_val_transforms(image_size), class_to_idx=class_to_idx)
    else:
        raise ValueError("val_dir is required to evaluate a checkpoint on data.")

    from torch.utils.data import DataLoader
    loader = DataLoader(ds, batch_size=32, num_workers=0, shuffle=False)

    all_logits = []
    all_labels = []
    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(dev)
            logits = model(images)
            all_logits.append(logits.cpu().numpy())
            all_labels.append(labels.numpy())

    logits = np.concatenate(all_logits)
    labels = np.concatenate(all_labels)
    metrics = compute_metrics(logits, labels)

    confusion = np.array(metrics["confusion"])
    support = confusion.sum(axis=1)
    pred_count = confusion.sum(axis=0)
    diag = np.diag(confusion)
    with np.errstate(divide="ignore", invalid="ignore"):
        precision = np.where(pred_count > 0, diag / np.maximum(pred_count, 1), 0.0)
        recall = np.where(support > 0, diag / np.maximum(support, 1), 0.0)
        f1 = np.where(precision + recall > 0, 2 * precision * recall / (precision + recall), 0.0)

    per_class = []
    for i, name in enumerate(class_names):
        per_class.append({
            "class": name,
            "index": i,
            "precision": float(precision[i]),
            "recall": float(recall[i]),
            "f1": float(f1[i]),
            "support": int(support[i]),
        })

    return {
        "macro_f1": metrics["macro_f1"],
        "accuracy": metrics["accuracy"],
        "per_class": per_class,
        "confusion_matrix": metrics["confusion"],
        "num_classes": num_classes,
        "classes": class_names,
        "checkpoint": str(ckpt_path),
        "ckpt_meta": {k: v for k, v in ckpt.items() if k != "state_dict"},
    }


def build_evaluation_artifacts(
    checkpoint: str | Path,
    val_dir: str | Path,
    reports_dir: str | Path,
    device: str = "auto",
    seed: int = 42,
    title: str = "Confusion Matrix",
) -> dict:
    """Evaluate and write metrics.json, model_report.md, confusion_matrix.png."""
    reports_dir = Path(reports_dir)
    reports_dir.mkdir(parents=True, exist_ok=True)

    result = evaluate_checkpoint(checkpoint, val_dir=val_dir, device=device, seed=seed)

    # --- metrics.json ---
    metrics_out = reports_dir / "metrics.json"
    with metrics_out.open("w") as fh:
        json.dump(result, fh, indent=2, default=str)

    # --- confusion matrix figure ---
    fig_dir = reports_dir.parent / "figures"
    fig_path = plot_confusion_matrix(
        np.array(result["confusion_matrix"]),
        result["classes"],
        fig_dir / "confusion_matrix.png",
        title=title,
    )

    # --- human-readable report ---
    # Express the figure path relative to the reports_dir (which contains the .md)
    try:
        fig_rel = fig_path.relative_to(reports_dir)
    except ValueError:
        fig_rel = Path("..") / fig_path.relative_to(reports_dir.parent)
    md = _render_markdown(result, ckpt_path=checkpoint, fig_rel=fig_rel)
    report_path = reports_dir / "model_report.md"
    report_path.write_text(md)

    print(f"  metrics.json        → {metrics_out}")
    print(f"  confusion matrix    → {fig_path}")
    print(f"  model_report.md     → {report_path}")
    return result


def _render_markdown(result: dict, ckpt_path, fig_rel: Path) -> str:
    lines = []
    lines.append("# Model Evaluation Report\n")
    lines.append(f"- Checkpoint: `{ckpt_path}`")
    lines.append(f"- Macro-F1 (**primary**): `{result['macro_f1']:.4f}`")
    lines.append(f"- Accuracy (secondary): `{result['accuracy']:.4f}`")
    lines.append(f"- Number of classes: `{result['num_classes']}`")
    lines.append("")

    lines.append("## Per-class metrics\n")
    lines.append("| Class | Precision | Recall | F1 | Support |")
    lines.append("|---|---|---|---|---|")
    for pc in result["per_class"]:
        lines.append(f"| {pc['class']} | {pc['precision']:.4f} | {pc['recall']:.4f} "
                     f"| {pc['f1']:.4f} | {pc['support']} |")
    lines.append("")

    lines.append("## Confusion matrix\n")
    lines.append(f"![Confusion matrix]({fig_rel})\n")

    lines.append("## Checkpoint metadata\n")
    lines.append("```json")
    lines.append(json.dumps(result["ckpt_meta"], indent=2, default=str))
    lines.append("```\n")
    return "\n".join(lines)