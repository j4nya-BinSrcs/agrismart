"""
Deep learning detector architecture and inference pipeline for AgriSmart AI.
Implements transfer learning using EfficientNet-B0 with custom classifier heads.

CRITICAL INTEGRITY PRINCIPLE:
Never fabricates ML predictions or uses heuristic fallback inside this ML module.
If trained weights are absent, cleanly raises RuntimeError or reports failure.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import json
import os

from .config import config, get_ml_service_dir


class AgriSmartDetector:
    """
    Inference and feature extraction engine for crop leaf disease detection.
    """

    def __init__(
        self,
        checkpoint_path: Optional[Union[str, Path]] = None,
        num_classes: Optional[int] = None,
        device: Optional[str] = None,
    ):
        self.device_str = device or ("cuda" if self._is_cuda_available() else "cpu")
        self.model = None
        self.class_names: List[str] = []
        self.class_to_idx: Dict[str, int] = {}
        self.num_classes = num_classes
        self.checkpoint_path = (
            Path(checkpoint_path) if checkpoint_path else config.model_checkpoint_path
        )
        self.knowledge_base = self._load_knowledge_base()

        # Load model weights if checkpoint exists
        if self.checkpoint_path.exists():
            self._load_checkpoint(self.checkpoint_path)

    @staticmethod
    def _is_cuda_available() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def _load_knowledge_base(self) -> Dict:
        kb_path = config.knowledge_base_path
        if kb_path.exists():
            with open(kb_path, "r", encoding="utf-8-sig") as f:
                return json.load(f)
        return {}

    def build_architecture(self, num_classes: int, pretrained: bool = False):
        """Builds EfficientNet-B0 architecture with tailored classification head."""
        try:
            import torch
            import torch.nn as nn
            import torchvision.models as models
        except ImportError:
            raise ImportError("PyTorch/Torchvision required to build model architecture.")

        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)

        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=config.dropout, inplace=True),
            nn.Linear(in_features, num_classes),
        )
        return model

    def _load_checkpoint(self, path: Path):
        """Loads trained weights from disk."""
        try:
            import torch

            device = torch.device(self.device_str)
            checkpoint = torch.load(path, map_location=device)

            self.num_classes = checkpoint.get("num_classes", self.num_classes)
            self.class_names = checkpoint.get("class_names", [])
            self.class_to_idx = checkpoint.get("class_to_idx", {})

            if not self.num_classes and self.class_names:
                self.num_classes = len(self.class_names)

            if not self.num_classes:
                raise ValueError("Checkpoint does not contain num_classes or class_names.")

            self.model = self.build_architecture(num_classes=self.num_classes, pretrained=False)
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            self.model.load_state_dict(state_dict)
            self.model.to(device)
            self.model.eval()
        except Exception as e:
            self.model = None
            raise RuntimeError(f"Failed to load model checkpoint from {path}: {e}")

    def predict_image(self, image_pil) -> Dict:
        """
        Runs real model inference on PIL image and attaches agronomic knowledge base data.
        Raises RuntimeError if model weights are not loaded.
        """
        if self.model is None:
            raise RuntimeError(
                "ML Model weights not loaded. Please train the model or provide a valid .pth checkpoint."
            )

        try:
            import torch
            from .training.dataset import get_transforms

            transform = get_transforms(image_size=config.image_size, is_train=False)
            tensor = transform(image_pil).unsqueeze(0).to(torch.device(self.device_str))

            with torch.no_grad():
                logits = self.model(tensor)
                probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

            top_idx = int(probs.argmax())
            confidence = float(probs[top_idx])
            pred_class = self.class_names[top_idx] if self.class_names else f"Class_{top_idx}"

            # Top-3 predictions
            top_3_indices = probs.argsort()[-3:][::-1]
            top_predictions = [
                {
                    "className": self.class_names[i] if self.class_names else f"Class_{i}",
                    "confidence": round(float(probs[i]), 4),
                }
                for i in top_3_indices
            ]

            # Knowledge base enrichment
            kb_entry = self.knowledge_base.get(pred_class, {})
            disease_name = kb_entry.get("disease_name", pred_class.replace("___", " - ").replace("_", " "))
            pathogen_name = kb_entry.get("pathogen_name", "")
            is_healthy = kb_entry.get("is_healthy", "healthy" in pred_class.lower())

            return {
                "success": True,
                "predictedClass": pred_class,
                "diseaseName": disease_name,
                "pathogenName": pathogen_name,
                "isHealthy": is_healthy,
                "confidence": round(confidence, 4),
                "severity": "low" if is_healthy else ("high" if confidence > 0.85 else "moderate"),
                "explanation": f"Crop anomaly classification identified {disease_name} with {round(confidence * 100, 1)}% confidence.",
                "symptomsMatched": kb_entry.get("symptoms", []),
                "symptomsRuledOut": [],
                "treatmentProtocols": kb_entry.get("treatment", {}),
                "precautions": kb_entry.get("precautions", []),
                "recommendedActions": [
                    {
                        "step": 1,
                        "title": "Field Inspection",
                        "description": f"Inspect nearby plants for symptoms matching {disease_name}.",
                        "timing": "Within 24 hours",
                    }
                ],
                "relatedInsights": {
                    "weatherRisk": "Check live local humidity levels before foliar spray application.",
                    "irrigationAdvice": "Avoid overhead watering if foliar fungal lesions are present.",
                    "sustainabilityImpact": "Targeted precision spraying minimizes broad-spectrum chemical runoff.",
                },
                "topPredictions": top_predictions,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}