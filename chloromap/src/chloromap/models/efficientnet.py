"""EfficientNetV2-S using timm."""

from __future__ import annotations

from typing import Optional

import torch.nn as nn

DEFAULT_MODEL_NAME = "tf_efficientnetv2_s"


def build_efficientnet(
    model_name: str = DEFAULT_MODEL_NAME,
    num_classes: Optional[int] = None,
    pretrained: bool = True,
) -> nn.Module:
    """Return an EfficientNetV2-S with a classification head sized to num_classes.

    If ``num_classes`` is None the ImageNet head is kept unchanged.
    """
    import timm

    model = timm.create_model(
        model_name,
        pretrained=pretrained,
        num_classes=num_classes if num_classes is not None else 1000,
    )
    return model


def freeze_backbone(model: nn.Module) -> None:
    """Freeze all parameters except the classification head."""
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = False


def unfreeze_from_layer(model: nn.Module, layer_name: str) -> None:
    """Unfreeze parameters from a named sub-module onward (depth-first).

    Works for both timm EfficientNetV2 (``blocks.*``) and torchvision
    backbones (``features.*``). ``layer_name`` should be a prefix, e.g.
    ``blocks.4``.
    """
    found = False
    for name, param in model.named_parameters():
        if name.startswith(layer_name):
            found = True
        if "classifier" in name:
            param.requires_grad = True
            continue
        param.requires_grad = found
    if not found:
        raise ValueError(
            f"Layer prefix '{layer_name}' not found in model parameters. "
            "Check it is a valid sub-module name (e.g. 'blocks.4')."
        )


def count_trainable_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def get_parameter_groups(model: nn.Module, backbone_lr: float, head_lr: float):
    """Return parameter groups with possibly-different learning rates.

    Used for fine-tuning: the still-frozen backbone gets backbone_lr.
    """
    groups = []
    backbone_params = []
    head_params = []
    for name, param in model.named_parameters():
        if param.requires_grad:
            if "classifier" in name:
                head_params.append(param)
            else:
                backbone_params.append(param)
    if backbone_params:
        groups.append({"params": backbone_params, "lr": backbone_lr})
    if head_params:
        groups.append({"params": head_params, "lr": head_lr})
    return groups