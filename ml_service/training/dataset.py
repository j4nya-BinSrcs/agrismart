"""
Dataset loader, validator, and augmentation pipelines for AgriSmart crop disease classification.

CRITICAL SIH ARCHITECTURAL DATASET PROTOCOL:
1. PLANTVILLAGE TRAINING DATA (plantvillage/train or 85% random split):
   Used strictly for model fitting and backpropagation.

2. PLANTVILLAGE VALIDATION DATA (plantvillage/val or 15% random split):
   Used strictly for model validation, early stopping, and hyperparameter selection.

3. PLANTVILLAGE INTERNAL TEST (plantvillage/internal_test - optional):
   Internal synthetic benchmark split. MUST NEVER be labeled as or substituted for the SIH field test.

4. SIH HELD-OUT FIELD-CONDITION TEST SET (field_test/):
   Separate, unseen field-condition dataset provided for final judging.
   MUST NEVER be accessed, referenced, or evaluated during the training loop.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import os

SUPPORTED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


@dataclass
class DatasetValidationReport:
    root_path: str
    is_present: bool
    total_images: int = 0
    corrupt_images: int = 0
    num_classes: int = 0
    class_names: List[str] = field(default_factory=list)
    class_distribution: Dict[str, int] = field(default_factory=dict)
    has_explicit_splits: bool = False
    train_count: int = 0
    val_count: int = 0
    internal_test_count: int = 0
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)

    @property
    def is_ready_for_training(self) -> bool:
        return self.is_present and self.num_classes >= 2 and self.total_images > 0 and len(self.issues) == 0


def discover_classes(dataset_dir: Path) -> List[str]:
    """
    Scans dataset directory to discover class subfolders sorted deterministically by string name.
    Filters out hidden directories and non-directory files.
    """
    if not dataset_dir.exists() or not dataset_dir.is_dir():
        return []

    # If dataset has explicit train split, discover classes inside train/
    if (dataset_dir / "train").exists() and (dataset_dir / "train").is_dir():
        target_dir = dataset_dir / "train"
    else:
        target_dir = dataset_dir

    raw_names = [
        d.name
        for d in target_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".") and not d.name.startswith("__")
    ]
    return sorted(raw_names)


def validate_dataset_structure(
    dataset_dir: Path,
    expected_classes: Optional[List[str]] = None,
    verify_images: bool = False,
) -> DatasetValidationReport:
    """
    Performs comprehensive dataset inspection and diagnostics.
    Enforces SIH protocol rules and prevents accidental contamination.
    """
    report = DatasetValidationReport(
        root_path=str(dataset_dir),
        is_present=dataset_dir.exists() and dataset_dir.is_dir(),
    )

    if not report.is_present:
        report.issues.append(f"Dataset root directory does not exist: {dataset_dir}")
        report.suggestions.append(
            f"Please download the PlantVillage dataset and place it in: {dataset_dir}"
        )
        report.suggestions.append("Refer to ml_service/README.md for directory formatting instructions.")
        return report

    # Guard against accidental use of field_test directory for training
    dir_name_lower = dataset_dir.name.lower()
    if "field_test" in dir_name_lower or "held_out" in dir_name_lower:
        report.issues.append(
            "CRITICAL SIH PROTOCOL VIOLATION: Target directory is identified as a held-out field test set. "
            "Field test data must NEVER be used as a training dataset."
        )
        return report

    # Check for explicit train/val/internal_test subdirectories
    has_train = (dataset_dir / "train").exists() and (dataset_dir / "train").is_dir()
    has_val = (dataset_dir / "val").exists() and (dataset_dir / "val").is_dir()
    has_internal_test = (dataset_dir / "internal_test").exists() and (dataset_dir / "internal_test").is_dir()

    report.has_explicit_splits = has_train and has_val

    classes = discover_classes(dataset_dir)
    report.class_names = classes
    report.num_classes = len(classes)

    if report.num_classes == 0:
        report.issues.append("No class subdirectories found inside dataset root.")
        report.suggestions.append(
            "Ensure images are organized into subfolders per disease class (e.g. data/plantvillage/Tomato___Early_blight/)."
        )
        return report

    # Determine scanning targets
    target_scan_dirs = []
    if report.has_explicit_splits:
        target_scan_dirs.append(("train", dataset_dir / "train"))
        target_scan_dirs.append(("val", dataset_dir / "val"))
        if has_internal_test:
            target_scan_dirs.append(("internal_test", dataset_dir / "internal_test"))
    else:
        target_scan_dirs.append(("root", dataset_dir))

    for split_name, base_path in target_scan_dirs:
        for cls in classes:
            cls_path = base_path / cls
            if not cls_path.exists():
                if split_name != "internal_test":
                    report.issues.append(f"Class directory '{cls}' missing from split: {split_name}")
                continue

            count = 0
            for f in cls_path.iterdir():
                if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                    if verify_images:
                        try:
                            from PIL import Image
                            with Image.open(f) as img:
                                img.verify()
                            count += 1
                        except Exception:
                            report.corrupt_images += 1
                    else:
                        count += 1

            if split_name == "train":
                report.train_count += count
            elif split_name == "val":
                report.val_count += count
            elif split_name == "internal_test":
                report.internal_test_count += count

            report.class_distribution[cls] = report.class_distribution.get(cls, 0) + count
            report.total_images += count

    if expected_classes:
        missing = set(expected_classes) - set(classes)
        unexpected = set(classes) - set(expected_classes)
        if missing:
            report.issues.append(f"Missing expected classes: {sorted(list(missing))}")
        if unexpected:
            report.suggestions.append(f"Additional discovered classes: {sorted(list(unexpected))}")

    if report.total_images == 0:
        report.issues.append("No valid image files found (.jpg, .jpeg, .png, .webp).")

    return report


def get_transforms(image_size: int = 224, is_train: bool = True):
    """
    Builds standard data transforms for training or evaluation.
    """
    try:
        import torchvision.transforms as T
    except ImportError:
        raise ImportError(
            "torchvision is required for transform construction. Please activate the ML virtual environment."
        )

    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])

    if is_train:
        return T.Compose(
            [
                T.Resize((image_size + 32, image_size + 32)),
                T.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
                T.RandomHorizontalFlip(p=0.5),
                T.RandomVerticalFlip(p=0.2),
                T.RandomRotation(degrees=15),
                T.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
                T.ToTensor(),
                normalize,
            ]
        )
    return T.Compose(
        [
            T.Resize((image_size, image_size)),
            T.CenterCrop(image_size),
            T.ToTensor(),
            normalize,
        ]
    )


class PlantVillageDataset:
    """
    PyTorch Dataset wrapper for PlantVillage crop disease images.
    """

    def __init__(self, samples: List[Tuple[Path, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        from PIL import Image

        img_path, label = self.samples[idx]
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            if self.transform:
                img = self.transform(img)
            return img, label