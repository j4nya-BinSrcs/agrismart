"""Shared synthetic fixtures — no real dataset / no network needed."""

from __future__ import annotations


import numpy as np
import pytest
import torch
from PIL import Image


CLASSES = ["Tomato___Early_blight", "Tomato___Late_blight", "Potato___Healthy", "Corn___Leaf_spot"]


@pytest.fixture
def synth_dataset(tmp_path):
    """Create a tiny dataset: 4 classes × 6 images of random noise PNGs."""
    rng = np.random.default_rng(0)
    for cls in CLASSES:
        d = tmp_path / "raw" / cls
        d.mkdir(parents=True, exist_ok=True)
        for i in range(6):
            arr = rng.integers(0, 255, (64, 64, 3), dtype=np.uint8)
            Image.fromarray(arr).save(d / f"{i:02d}.png")
    return tmp_path / "raw"


@pytest.fixture
def tiny_checkpoint(tmp_path):
    """Build a random-weight EfficientNetV2-S classifier checkpoint (CPU)."""
    from chloromap.models.factory import build_model

    model = build_model("tf_efficientnetv2_s", num_classes=len(CLASSES), pretrained=False)
    ckpt = {
        "model_name": "tf_efficientnetv2_s",
        "num_classes": len(CLASSES),
        "class_names": CLASSES,
        "image_size": 224,
        "augmentation": "minimal",
        "seed": 42,
        "epochs": 1,
        "batch_size": 4,
        "optimizer": "AdamW",
        "learning_rate": 1e-3,
        "weight_decay": 1e-4,
        "scheduler": "cosine",
        "loss": "CrossEntropyLoss",
        "state_dict": model.state_dict(),
        "best_epoch": 1,
        "validation_macro_f1": 0.25,
        "validation_accuracy": 0.25,
    }
    path = tmp_path / "best_model.pth"
    torch.save(ckpt, path)
    return path