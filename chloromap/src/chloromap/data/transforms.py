"""Preprocessing and augmentation transforms."""

from __future__ import annotations

from torchvision.transforms import (
    Compose,
    CenterCrop,
    ColorJitter,
    GaussianBlur,
    InterpolationMode,
    Normalize,
    RandomErasing,
    RandomHorizontalFlip,
    RandomResizedCrop,
    Resize,
    ToTensor,
)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_train_transforms(
    image_size: int = 224,
    augmentation: str = "mild",
    erasing: float = 0.0,
) -> Compose:
    """Return training transforms with realistic augmentation.

    Presets
    -------
    minimal : just random crop + horizontal flip.
    mild    : mild colour jitter + slight blur (field-robust).
    strong  : more aggressive (not recommended until validated).

    ``erasing`` appends a :class:`RandomErasing` (probability ``erasing``,
    scale 0.02-0.30) after normalization — robust to occlusions/stains on
    real leaf images. Disabled when ``erasing <= 0``.
    """
    if augmentation == "minimal":
        post = Compose([
            RandomResizedCrop(image_size, interpolation=InterpolationMode.BILINEAR),
            RandomHorizontalFlip(),
        ])
    elif augmentation == "strong":
        post = Compose([
            RandomResizedCrop(image_size, interpolation=InterpolationMode.BILINEAR),
            RandomHorizontalFlip(),
            ColorJitter(brightness=0.4, contrast=0.4, saturation=0.3, hue=0.15),
            GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
        ])
    else:
        post = Compose([
            RandomResizedCrop(image_size, interpolation=InterpolationMode.BILINEAR),
            RandomHorizontalFlip(),
            ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1, hue=0.05),
            GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)),
        ])

    pipeline = [
        post,
        ToTensor(),
        Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]
    if erasing > 0:
        pipeline.append(RandomErasing(p=erasing, scale=(0.02, 0.30), ratio=(0.3, 3.3), value="random"))
    return Compose(pipeline)


def get_val_transforms(image_size: int = 224) -> Compose:
    """Deterministic preprocessing for validation / inference."""
    return Compose([
        Resize(int(image_size * 256 / 224), interpolation=InterpolationMode.BILINEAR),
        CenterCrop(image_size),
        ToTensor(),
        Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
