"""Inference preprocessing — must match validation preprocessing exactly."""

from __future__ import annotations

import warnings
from pathlib import Path

import torch
from PIL import Image, ImageOps

from ..data.transforms import get_val_transforms

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

# Hard cap on decoded image size (anti decompression-bomb). Any image with more
# pixels is rejected by the API with a 413. 40 MP is far above any camera/phone
# photo while keeping CPU decode + resize cheap and predictable.
MAX_IMAGE_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class ImageTooLargeError(ValueError):
    """Raised when a decoded image exceeds MAX_IMAGE_PIXELS (decompression bomb)."""


# ---------------------------------------------------------------------------
def _to_rgb(image: Image.Image) -> Image.Image:
    """Normalise orientation (EXIF) and colour mode; forces a full pixel decode."""
    image = ImageOps.exif_transpose(image)
    if image.mode != "RGB":
        image = image.convert("RGB")
    else:
        image.load()
    return image


def _guard_pixels(image: Image.Image) -> None:
    width, height = image.size
    if width * height > MAX_IMAGE_PIXELS:
        raise ImageTooLargeError(
            f"Image is {width}x{height} ({width * height:,} px) — "
            f"exceeds max {MAX_IMAGE_PIXELS:,} px"
        )


def _open_safe(data: bytes) -> Image.Image:
    """Open raw bytes with dimension guarding and EXIF orientation applied."""
    from io import BytesIO

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = _to_rgb(Image.open(BytesIO(data)))
            _guard_pixels(image)
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageTooLargeError(f"Image exceeds max {MAX_IMAGE_PIXELS:,} px") from exc
    except Exception as exc:
        raise ValueError(f"Could not decode image bytes: {exc}") from exc
    return image


# ---------------------------------------------------------------------------
def load_image_pil(path: str | Path) -> Image.Image:
    """Load and validate an image file; always returns an EXIF-correct RGB image."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported image format '{path.suffix}'. Supported: {sorted(SUPPORTED_EXTS)}")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = _to_rgb(Image.open(path))
            _guard_pixels(image)
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageTooLargeError(f"Image exceeds max {MAX_IMAGE_PIXELS:,} px") from exc
    except Exception as exc:
        raise ValueError(f"Could not decode image {path}: {exc}") from exc
    return image


def build_tensor(image: Image.Image, image_size: int = 224) -> torch.Tensor:
    """Apply the deterministic validation preprocessing and return a batch tensor."""
    transforms = get_val_transforms(image_size)
    tensor = transforms(image)  # (C, H, W)
    return tensor.unsqueeze(0)  # (1, C, H, W)


def decode_from_bytes(data: bytes, image_size: int = 224) -> torch.Tensor:
    """Decode raw image bytes to a model-ready tensor (used by the API)."""
    return build_tensor(_open_safe(data), image_size)