"""Model factory — single entry point to construct models by name."""

from __future__ import annotations

import torch.nn as nn

from .efficientnet import build_efficientnet


def build_model(
    model_name: str,
    num_classes: int,
    pretrained: bool = True,
    **kwargs,
) -> nn.Module:
    """Construct a classification model.

    Supported ``model_name`` values (timm identifiers):
      - ``tf_efficientnetv2_s``  (default / recommended)
      - any other timm classifier name (e.g. ``resnet50``, ``convnext_tiny``)
    """
    if model_name.startswith("tf_efficientnetv2"):
        return build_efficientnet(model_name, num_classes=num_classes, pretrained=pretrained)
    import timm

    return timm.create_model(model_name, pretrained=pretrained, num_classes=num_classes)