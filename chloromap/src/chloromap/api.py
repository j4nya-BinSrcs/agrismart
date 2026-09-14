"""FastAPI inference service for the disease classifier.

Endpoints
---------
GET  /health           → diagnostics
GET  /metadata         → model & checkpoint metadata
POST /predict          → multipart image upload → classification JSON
POST /api/v1/predict   → versioned alias of /predict (used by the MERN frontend)

Launch with:
    uvicorn chloromap.api:app --host 0.0.0.0 --port 8000
or:
    python scripts/serve.py [--port 8000] [--checkpoint weights/best_model.pth]

The model is loaded once at startup (see :func:`load_model`), never per request.
Blocking image decode + inference run in a threadpool, so the event loop stays
responsive under concurrent uploads.
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .inference.predictor import Predictor
from .inference.preprocessing import ImageTooLargeError, decode_from_bytes

log = logging.getLogger("chloromap.api")

DEFAULT_CHECKPOINT = str(Path(__file__).resolve().parents[2] / "weights" / "best_model.pth")
MAX_UPLOAD_BYTES = 10_485_760  # 10 MB
ALLOWED_MIME_PREFIXES = ("image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff")

# CORS: allow cross-origin calls from the MERN frontend.
# Comma-separated list via CHLOROMAP_CORS_ORIGINS or AGRISMART_CORS_ORIGINS, default "*" (any origin).
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CHLOROMAP_CORS_ORIGINS", os.getenv("AGRISMART_CORS_ORIGINS", "*")).split(",") if o.strip()
]

_predictor: Predictor | None = None


class PredictResponse(BaseModel):
    class_id: int
    class_name: str
    confidence: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str


class MetadataResponse(BaseModel):
    model_name: str
    checkpoint: str
    num_classes: int
    class_names: list[str]
    image_size: int
    device: str
    validation_macro_f1: float | None = None
    validation_accuracy: float | None = None
    best_epoch: int | None = None


# ---------------------------------------------------------------------------
# Model loader (called once at startup)
# ---------------------------------------------------------------------------
def get_predictor() -> Predictor:
    if _predictor is None:
        raise RuntimeError("Model not loaded — call load_model() at startup")
    return _predictor


def load_model(checkpoint: str | None = None) -> Predictor:
    """Load the checkpoint once. Safe to call multiple times (reuses instance)."""
    global _predictor
    if _predictor is not None:
        return _predictor
    path = checkpoint or DEFAULT_CHECKPOINT
    _predictor = Predictor(path)
    log.info("Model loaded: device=%s classes=%d checkpoint=%s",
             _predictor.device, _predictor.num_classes, path)
    if _predictor.device.type == "cuda":
        log.info("GPU: %s", torch.cuda.get_device_name(0))
    return _predictor


# ---------------------------------------------------------------------------
# Inference helpers (runs off the event loop in a threadpool)
# ---------------------------------------------------------------------------
def _classify_bytes(data: bytes, predictor: Predictor) -> PredictResponse:
    """Blocking decode + forward pass. Safe to call from a worker thread."""
    tensor = decode_from_bytes(data, predictor.image_size).to(predictor.device)
    class_id, confidence, latency_s = predictor.predict_tensor(tensor)
    log.info("predicted=%d/%s conf=%.4f latency=%.1fms",
             class_id, predictor.class_names[class_id], confidence, latency_s * 1000)
    return PredictResponse(
        class_id=class_id,
        class_name=predictor.class_names[class_id],
        confidence=confidence,
    )


async def _predict_upload(image: UploadFile) -> PredictResponse:
    """Validate an upload, then classify off the event loop."""
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="No file uploaded (field name: image)")

    ctype = (image.content_type or "").lower()
    if not ctype.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=400, detail=f"Unsupported media type '{ctype or 'unknown'}'. "
            "Send a JPEG, PNG, WEBP, BMP or TIFF image."
        )

    data = await image.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)")

    predictor = get_predictor()
    try:
        return await asyncio.to_thread(_classify_bytes, data, predictor)
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Image could not be decoded: {exc}")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Chloromap AI — Disease Classifier", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        device = str(get_predictor().device)
    except RuntimeError:
        device = "not-loaded"
    return HealthResponse(status="ok", model_loaded=_predictor is not None, device=device)


@app.get("/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    predictor = get_predictor()
    meta = predictor.ckpt_meta
    return MetadataResponse(
        model_name=predictor.model_name,
        checkpoint=str(predictor.checkpoint),
        num_classes=predictor.num_classes,
        class_names=predictor.class_names,
        image_size=predictor.image_size,
        device=str(predictor.device),
        validation_macro_f1=meta.get("validation_macro_f1"),
        validation_accuracy=meta.get("validation_accuracy"),
        best_epoch=meta.get("best_epoch"),
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...)) -> PredictResponse:
    return await _predict_upload(image)


@app.post("/api/v1/predict", response_model=PredictResponse)
async def predict_v1(image: UploadFile = File(...)) -> PredictResponse:
    return await _predict_upload(image)