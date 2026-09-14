"""Model construction / checkpoint tests."""

import torch

from chloromap.models.factory import build_model
from chloromap.models.efficientnet import (
    count_trainable_params,
    freeze_backbone,
    unfreeze_from_layer,
)
from conftest import CLASSES


def test_model_construction():
    model = build_model("tf_efficientnetv2_s", num_classes=4, pretrained=False)
    assert isinstance(model, torch.nn.Module)
    n_params = sum(p.numel() for p in model.classifier.parameters())
    assert n_params > 0


def test_output_shape(synth_dataset):
    model = build_model("tf_efficientnetv2_s", num_classes=4, pretrained=False)
    model.eval()
    x = torch.randn(2, 3, 224, 224)
    with torch.inference_mode():
        out = model(x)
    assert out.shape == (2, 4)


def test_class_count_from_dataset(synth_dataset):
    from chloromap.data.dataset import CropDiseaseDataset
    ds = CropDiseaseDataset(synth_dataset)
    model = build_model("tf_efficientnetv2_s", num_classes=ds.num_classes, pretrained=False)
    x = torch.randn(1, 3, 224, 224)
    assert model(x).shape == (1, ds.num_classes)


def test_freeze_and_unfreeze():
    model = build_model("tf_efficientnetv2_s", num_classes=4, pretrained=False)
    freeze_backbone(model)
    frozen = count_trainable_params(model)
    head_only = sum(p.numel() for p in model.classifier.parameters())
    assert frozen == head_only

    unfreeze_from_layer(model, "blocks.4")
    assert count_trainable_params(model) > frozen


def test_checkpoint_loading(tiny_checkpoint):
    ckpt = torch.load(tiny_checkpoint, map_location="cpu", weights_only=False)
    assert ckpt["num_classes"] == len(CLASSES)
    assert ckpt["class_names"] == CLASSES
    model = build_model("tf_efficientnetv2_s", num_classes=ckpt["num_classes"], pretrained=False)
    model.load_state_dict(ckpt["state_dict"])
    assert "classifier.bias" in ckpt["state_dict"]


def test_checkpoint_shape_mismatch_fails(tiny_checkpoint):
    ckpt = torch.load(tiny_checkpoint, map_location="cpu", weights_only=False)
    model = build_model("tf_efficientnetv2_s", num_classes=7, pretrained=False)
    try:
        model.load_state_dict(ckpt["state_dict"])
        raise AssertionError("Expected RuntimeError for shape mismatch")
    except RuntimeError:
        pass