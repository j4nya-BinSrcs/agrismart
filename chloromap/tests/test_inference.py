"""Inference / predictor tests."""

import numpy as np
import torch
from PIL import Image

from chloromap.inference.predictor import Predictor
from chloromap.inference.preprocessing import build_tensor, load_image_pil


def test_predict_valid_image(synth_dataset, tiny_checkpoint):
    predictor = Predictor(tiny_checkpoint, device="cpu")
    img = synth_dataset / "Tomato___Early_blight" / "00.png"
    result = predictor.predict(img)
    assert set(result.keys()) == {"class_id", "class_name", "confidence"}
    assert 0 <= result["class_id"] < 4
    assert result["class_name"] in predictor.class_names
    assert 0.0 <= result["confidence"] <= 1.0


def test_predict_missing_image_raises(tiny_checkpoint):
    predictor = Predictor(tiny_checkpoint, device="cpu")
    try:
        predictor.predict("/nonexistent/image.png")
        raise AssertionError("Expected FileNotFoundError")
    except FileNotFoundError:
        pass


def test_predict_bad_format_raises(tmp_path, tiny_checkpoint):
    bad = tmp_path / "notes.txt"
    bad.write_text("not an image")
    predictor = Predictor(tiny_checkpoint, device="cpu")
    try:
        predictor.predict(bad)
        raise AssertionError("Expected ValueError for unsupported format")
    except ValueError:
        pass


def test_rgb_conversion(tmp_path, tiny_checkpoint):
    predictor = Predictor(tiny_checkpoint, device="cpu")
    # single-channel image must be converted to RGB, not crash
    arr = np.random.default_rng(0).integers(0, 255, (40, 40), dtype=np.uint8)
    gray = tmp_path / "gray.png"
    Image.fromarray(arr, mode="L").save(gray)
    result = predictor.predict(gray)
    assert result["class_name"] in predictor.class_names


def test_top_k(tiny_checkpoint, synth_dataset):
    predictor = Predictor(tiny_checkpoint, device="cpu")
    img = synth_dataset / "Potato___Healthy" / "00.png"
    result = predictor.predict(img, top_k=3)
    assert "predictions" in result
    assert len(result["predictions"]) == 3
    probs = [p["confidence"] for p in result["predictions"]]
    assert probs == sorted(probs, reverse=True)  # descending


def test_predict_on_cpu_only(tiny_checkpoint, synth_dataset):
    import torch
    if torch.cuda.is_available():
        # even when CUDA is around, force CPU explicitly
        predictor = Predictor(tiny_checkpoint, device="cpu")
        assert str(predictor.device) == "cpu"
        result = predictor.predict(synth_dataset / "Corn___Leaf_spot" / "01.png")
        assert result["class_name"] in predictor.class_names
    else:
        predictor = Predictor(tiny_checkpoint, device="cpu")
        result = predictor.predict(synth_dataset / "Corn___Leaf_spot" / "01.png")
        assert result["class_name"] in predictor.class_names


def test_preprocessing_identity():
    img = Image.fromarray(np.random.default_rng(3).integers(0, 255, (300, 300, 3), dtype=np.uint8))
    tensor = build_tensor(img, 224)
    assert tensor.shape == (1, 3, 224, 224)
    assert tensor.dtype == torch.float32


def test_load_image_pil_rejects_zero_bytes(tmp_path):
    bad = tmp_path / "empty.png"
    bad.write_bytes(b"")
    try:
        load_image_pil(bad)
        raise AssertionError("Expected ValueError for empty image")
    except ValueError:
        pass