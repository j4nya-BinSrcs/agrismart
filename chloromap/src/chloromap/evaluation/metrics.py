"""Classification metrics — Macro-F1 is the primary metric."""

from __future__ import annotations

import numpy as np


def compute_metrics(
    logits: np.ndarray,
    labels: np.ndarray,
) -> dict:
    """Compute Macro-F1, accuracy, precision, recall from logits.

    Parameters
    ----------
    logits : (N, C) raw model outputs.
    labels : (N,) integer class labels.

    Returns
    -------
    dict with macro_f1, precision, recall, accuracy, class counts.
    """
    preds = np.argmax(logits, axis=1)

    num_classes = logits.shape[1]
    confusion = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(labels, preds):
        confusion[t, p] += 1

    tp = np.diag(confusion)
    support = confusion.sum(axis=1)
    pred_count = confusion.sum(axis=0)

    with np.errstate(divide="ignore", invalid="ignore"):
        precision = np.where(pred_count > 0, tp / np.maximum(pred_count, 1), 0.0)
        recall = np.where(support > 0, tp / np.maximum(support, 1), 0.0)
        f1 = np.where(precision + recall > 0, 2 * (precision * recall) / (precision + recall), 0.0)

    valid = support > 0
    macro_f1 = float(f1[valid].mean()) if valid.any() else 0.0
    macro_precision = float(precision[valid].mean()) if valid.any() else 0.0
    macro_recall = float(recall[valid].mean()) if valid.any() else 0.0
    accuracy = float((preds == labels).mean())

    return {
        "macro_f1": macro_f1,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "accuracy": accuracy,
        "confusion": confusion.tolist(),
        "classified": preds.tolist(),
        "labels": labels.tolist(),
    }


def macro_f1_from_confusion(confusion: np.ndarray) -> float:
    """Macro-F1 computed directly from a confusion matrix."""
    tp = np.diag(confusion)
    support = confusion.sum(axis=1)
    pred_count = confusion.sum(axis=0)
    with np.errstate(divide="ignore", invalid="ignore"):
        precision = tp / np.maximum(pred_count, 1)
        recall = tp / np.maximum(support, 1)
        f1 = np.where(precision + recall > 0, 2 * (precision * recall) / (precision + recall), 0.0)
    valid = support > 0
    return float(f1[valid].mean())