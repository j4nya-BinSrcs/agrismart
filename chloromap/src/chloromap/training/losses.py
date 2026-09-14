"""Loss functions."""

from __future__ import annotations

from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """Focal loss (Lin et al., 2017) for hard examples — hard-label variant.

    ``gamma`` down-weights well-classified samples; ``alpha`` optionally
    re-weights classes (pass a 1-D tensor of length ``C``).
    """

    def __init__(
        self,
        gamma: float = 2.0,
        alpha: Optional[torch.Tensor] = None,
        reduction: str = "mean",
    ) -> None:
        super().__init__()
        self.gamma = gamma
        self.reduction = reduction
        if alpha is not None:
            self.register_buffer("alpha", alpha)
        else:
            self.alpha = None

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        log_probs = F.log_softmax(logits, dim=1)
        probs = log_probs.exp()
        pt = probs.gather(1, targets.unsqueeze(1)).squeeze(1)
        log_pt = log_probs.gather(1, targets.unsqueeze(1)).squeeze(1)
        focal = (1 - pt).pow(self.gamma) * (-log_pt)
        if self.alpha is not None:
            focal = self.alpha.to(focal.device).gather(0, targets) * focal
        if self.reduction == "mean":
            return focal.mean()
        if self.reduction == "sum":
            return focal.sum()
        return focal


def build_loss(
    name: str,
    num_classes: int = 0,
    label_smoothing: float = 0.0,
    gamma: float = 2.0,
    class_weights: Optional[list] | Optional[torch.Tensor] = None,
) -> nn.Module:
    """Create a loss module by name.

    ``class_weights`` (length ``C``) enables the weighted variants of
    CrossEntropy / Focal when provided.
    """
    name = name.lower()
    alpha = None
    if class_weights is not None:
        if not isinstance(class_weights, torch.Tensor):
            class_weights = torch.tensor(list(class_weights), dtype=torch.float)
        alpha = class_weights

    if name == "crossentropyloss":
        if label_smoothing > 0:
            return nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        return nn.CrossEntropyLoss()
    if name in {"weighted_crossentropyloss", "weighted_cross_entropy"}:
        if alpha is None:
            raise ValueError(
                "Weighted CrossEntropy requires class weights; "
                "call make_weighted_cross_entropy directly or set class_weights."
            )
        return make_weighted_cross_entropy(alpha)
    if name in {"focal", "focalloss"}:
        return FocalLoss(gamma=gamma, alpha=alpha)
    raise ValueError(f"Unknown loss: {name}")


def make_weighted_cross_entropy(class_weights: torch.Tensor) -> nn.Module:
    return nn.CrossEntropyLoss(weight=class_weights)


def compute_class_weights(counts: list[int]) -> torch.Tensor:
    """Inverse-frequency class weights (normalised)."""
    counts = torch.tensor(counts, dtype=torch.float)
    total = counts.sum()
    weights = total / (len(counts) * counts.clamp_min(1.0))
    return weights / weights.sum()