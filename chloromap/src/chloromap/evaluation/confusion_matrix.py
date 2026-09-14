"""Confusion-matrix generation and plotting."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def plot_confusion_matrix(
    confusion: np.ndarray,
    class_names: list[str],
    save_path: str | Path,
    title: str = "Confusion Matrix",
) -> Path:
    """Render a confusion matrix figure. Rows=actual, columns=predicted."""
    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    n = confusion.shape[0]
    fig, ax = plt.subplots(figsize=(max(8, n * 0.5), max(7, n * 0.5)))
    im = ax.imshow(confusion, cmap="Blues", interpolation="nearest")
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label("Count")

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    # short labels for readability
    short = [c.split("___")[-1] if "___" in c else c for c in class_names]
    ax.set_xticklabels(short, rotation=90)
    ax.set_yticklabels(short)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title)

    threshold = confusion.max() / 2 if confusion.max() else 1
    for i in range(n):
        for j in range(n):
            val = confusion[i, j]
            if val > 0:
                ax.text(j, i, str(val), ha="center", va="center",
                        color="white" if val > threshold else "black", fontsize=8)

    fig.tight_layout()
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return save_path