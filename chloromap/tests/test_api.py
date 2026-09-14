"""FastAPI inference-service tests (no real dataset required)."""

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture
def client(tiny_checkpoint):
    from chloromap import api

    # Load the tiny random-weight checkpoint once for this test module
    api._predictor = None
    api.load_model(str(tiny_checkpoint))
    return TestClient(api.app)


@pytest.fixture
def image_bytes(synth_dataset):
    p = synth_dataset / "Tomato___Early_blight" / "00.png"
    return p.read_bytes()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["device"] in {"cpu", "cuda"}


def test_predict_schema(client, image_bytes):
    r = client.post("/predict", files={"image": ("leaf.png", image_bytes, "image/png")})
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"class_id", "class_name", "confidence"}
    assert 0 <= body["class_id"] < 4
    assert 0.0 <= body["confidence"] <= 1.0


def test_predict_rejects_bad_mime(client):
    r = client.post("/predict", files={"image": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400
    assert "media type" in r.json()["detail"].lower()


def test_predict_rejects_empty(client):
    r = client.post("/predict", files={"image": ("empty.png", b"", "image/png")})
    assert r.status_code == 400


def test_predict_rejects_undecodable(client):
    r = client.post("/predict", files={"image": ("fake.png", b"not-an-image", "image/png")})
    assert r.status_code == 422


def test_predict_requires_file(client):
    r = client.post("/predict")
    assert r.status_code == 422  # missing required multipart field


def test_metadata(client):
    r = client.get("/metadata")
    assert r.status_code == 200
    body = r.json()
    assert body["model_name"] == "tf_efficientnetv2_s"
    assert body["num_classes"] == 4
    assert body["class_names"] == ["Tomato___Early_blight", "Tomato___Late_blight",
                                   "Potato___Healthy", "Corn___Leaf_spot"]
    assert body["image_size"] == 224
    assert body["device"] in {"cpu", "cuda"}
    assert body["validation_macro_f1"] == 0.25
    assert body["best_epoch"] == 1


def test_predict_v1_alias(client, image_bytes):
    r = client.post("/api/v1/predict",
                    files={"image": ("leaf.png", image_bytes, "image/png")})
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"class_id", "class_name", "confidence"}


def test_cors_header(client):
    origin = "http://localhost:3000"
    r = client.post(
        "/predict",
        files={"image": ("leaf.png", b"", "image/png")},
        headers={"Origin": origin},
    )
    assert r.headers.get("access-control-allow-origin") in {origin, "*"}


def test_rejects_decompression_bomb(client):
    # 6500x6500 single-colour PNG compresses to a few KB but decodes to
    # 42.25 MP — above MAX_IMAGE_PIXELS (40 MP) → 413, not 422.
    bomb = Image.new("RGB", (6500, 6500), "red")
    buf = io.BytesIO()
    bomb.save(buf, format="PNG")
    r = client.post("/predict", files={"image": ("bomb.png", buf.getvalue(), "image/png")})
    assert r.status_code == 413


def test_exif_orientation_applied():
    from chloromap.inference.preprocessing import _open_safe

    base = Image.new("RGB", (400, 200), "red")
    exif = base.getexif()
    exif[0x0112] = 6  # Orientation: Rotate 90 CW -> decoded size must be 200x400
    buf = io.BytesIO()
    base.save(buf, format="JPEG", exif=exif)

    out = _open_safe(buf.getvalue())
    assert out.size == (200, 400)