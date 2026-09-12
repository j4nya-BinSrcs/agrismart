"""
FastAPI Microservice for AgriSmart AI Crop Disease Classification.
Listens on http://127.0.0.1:8000 and bridges directly with the Node.js Express backend.
"""

import base64
import io
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

from .config import config
from .detector import AgriSmartDetector

# Global detector instance
detector: Optional[AgriSmartDetector] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector
    try:
        detector = AgriSmartDetector()
        print(f"[AgriSmart ML Service] Initialized on device: {detector.device_str}")
        print(f"[AgriSmart ML Service] Checkpoint exists: {detector.checkpoint_path.exists()}")
    except Exception as e:
        print(f"[AgriSmart ML Service] Notice: Model initialized in standby mode ({e})")
        detector = None
    yield


app = FastAPI(
    title="AgriSmart AI — Crop Disease ML Microservice",
    version="1.0.0",
    description="Deep Learning API for crop leaf disease detection & agronomic guidance",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    image: str = Field(..., description="Base64 Data URI or raw base64 string of the crop leaf image")
    crop: Optional[str] = Field(None, description="Optional crop hint from user")
    variety: Optional[str] = Field(None, description="Optional variety name")


@app.get("/health")
def health():
    """Health check endpoint providing runtime diagnostics."""
    is_ready = detector is not None and detector.model is not None
    return {
        "status": "online",
        "service": "AgriSmart Crop Disease Classifier",
        "model_loaded": is_ready,
        "device": detector.device_str if detector else "uninitialized",
        "checkpoint": str(config.model_checkpoint_path),
        "knowledge_base_entries": len(detector.knowledge_base) if detector else 0,
    }


@app.post("/predict")
async def predict(payload: PredictRequest):
    """
    Receives crop leaf image from Node.js backend, runs PyTorch inference, and returns agronomic diagnosis.
    """
    if not payload.image:
        raise HTTPException(status_code=400, detail="Image payload is required.")

    # 1. Decode base64 image
    try:
        raw_base64 = payload.image
        if "," in raw_base64:
            raw_base64 = raw_base64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to decode base64 image: {str(e)}"
        )

    # 2. Run inference
    if detector is None or detector.model is None:
        raise HTTPException(
            status_code=503,
            detail="ML Model weights not loaded. Please train or provide model checkpoint.",
        )

    result = detector.predict_image(image)

    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=result.get("error", "Inference failed."))

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.host, port=config.port)
