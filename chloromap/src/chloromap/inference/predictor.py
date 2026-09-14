"""Predictor — reusable model-inference interface.

The predictor loads its checkpoint once and is safe for concurrent
model-serving (a new forward pass per ``predict`` call).
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
import torch

from ..models.factory import build_model
from .preprocessing import build_tensor, load_image_pil


class Predictor:
    def __init__(
        self,
        checkpoint: str | Path,
        device: str = "auto",
    ) -> None:
        self.checkpoint = Path(checkpoint)
        if not self.checkpoint.exists():
            raise FileNotFoundError(f"Checkpoint not found: {self.checkpoint}")

        ckpt = torch.load(self.checkpoint, map_location="cpu", weights_only=False)
        self.ckpt_meta = {k: v for k, v in ckpt.items() if k != "state_dict"}

        self.class_names: list[str] = ckpt.get("class_names") or ckpt.get("classes")
        if self.class_names is None:
            raise ValueError("Checkpoint has no class_names — cannot build predictor.")
        self.class_to_idx = {c: i for i, c in enumerate(self.class_names)}
        self.num_classes = len(self.class_names)

        self.image_size: int = int(ckpt.get("image_size", 224))
        self.model_name: str = ckpt.get("model_name", "tf_efficientnetv2_s")

        self.model = build_model(self.model_name, self.num_classes, pretrained=False)
        state = ckpt.get("state_dict") or ckpt
        self.model.load_state_dict(state)

        if device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        self.model.to(self.device)
        self.model.eval()

    # ------------------------------------------------------------------
    def _softmax_probs(self, logits: np.ndarray) -> np.ndarray:
        logits = logits - logits.max()
        exp = np.exp(logits)
        return exp / exp.sum()

    # ------------------------------------------------------------------
    def predict(
        self,
        image_path: str | Path,
        top_k: int = 1,
    ) -> dict:
        """Predict the class of an image file.

        top_k (default 1) returns a single best prediction when 1,
        otherwise a list of the ``top_k`` most likely classes.
        """
        image = load_image_pil(image_path)
        tensor = build_tensor(image, self.image_size).to(self.device)

        with torch.inference_mode():
            logits = self.model(tensor).cpu().numpy()[0]

        probs = self._softmax_probs(logits)

        if top_k == 1:
            pred_idx = int(np.argmax(probs))
            return {
                "class_id": pred_idx,
                "class_name": self.class_names[pred_idx],
                "confidence": float(probs[pred_idx]),
            }

        top_indices = np.argsort(probs)[::-1][:top_k]
        predictions = [
            {
                "class_id": int(i),
                "class_name": self.class_names[i],
                "confidence": float(probs[i]),
            }
            for i in top_indices
        ]
        return {"predictions": predictions}

    # ------------------------------------------------------------------
    def predict_tensor(self, tensor: torch.Tensor) -> tuple[int, float]:
        """Low-level predict on a raw (1, C, H, W) tensor — used by the API/benchmark."""
        t0 = time.perf_counter()
        with torch.inference_mode():
            logits = self.model(tensor).cpu().numpy()[0]
        probs = self._softmax_probs(logits)
        pred_idx = int(np.argmax(probs))
        latency = time.perf_counter() - t0
        return pred_idx, float(probs[pred_idx]), latency