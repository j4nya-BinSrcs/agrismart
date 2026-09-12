"""
AgriSmart AI — ML Service Configuration Manager.
Uses relative paths anchored to the project directory and supports environment variable overrides.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


def get_ml_service_dir() -> Path:
    """Returns the absolute Path to the ml_service directory."""
    return Path(__file__).resolve().parent


def get_project_root() -> Path:
    """Returns the absolute Path to the AgriSmart project root."""
    return get_ml_service_dir().parent


@dataclass
class MLConfig:
    # Service Network Configuration
    host: str = os.getenv("ML_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("ML_SERVICE_PORT", "8000"))

    # Model Parameters
    architecture: str = "efficientnet_b0"
    num_classes: Optional[int] = None  # Dynamically discovered from dataset classes
    image_size: int = 224
    dropout: float = 0.30
    pretrained: bool = True

    # Training Hyperparameters
    batch_size: int = int(os.getenv("AGRISMART_BATCH_SIZE", "32"))
    epochs: int = int(os.getenv("AGRISMART_EPOCHS", "25"))
    learning_rate: float = float(os.getenv("AGRISMART_LR", "0.0003"))
    weight_decay: float = 0.0001
    val_split_ratio: float = 0.15  # 15% of PlantVillage reserved for validation
    seed: int = 42
    early_stopping_patience: int = 5

    # Hardware & Precision
    device: str = os.getenv("AGRISMART_DEVICE", "cuda")
    mixed_precision: bool = True
    num_workers: int = 2

    # Relative Paths for Datasets & Artifacts
    model_checkpoint_path: Path = get_ml_service_dir() / "models" / "best_crop_model.pth"
    knowledge_base_path: Path = get_ml_service_dir() / "knowledge_base.json"
    data_dir: Path = get_ml_service_dir() / "data"
    plantvillage_dir: Path = get_ml_service_dir() / "data" / "plantvillage"
    field_test_dir: Path = get_ml_service_dir() / "data" / "field_test"
    reports_dir: Path = get_ml_service_dir() / "reports"

    def __post_init__(self):
        if "AGRISMART_PLANTVILLAGE_DIR" in os.environ:
            p = Path(os.environ["AGRISMART_PLANTVILLAGE_DIR"])
            self.plantvillage_dir = p if p.is_absolute() else get_project_root() / p

        if "AGRISMART_FIELD_TEST_DIR" in os.environ:
            p = Path(os.environ["AGRISMART_FIELD_TEST_DIR"])
            self.field_test_dir = p if p.is_absolute() else get_project_root() / p

        if "AGRISMART_CHECKPOINT_PATH" in os.environ:
            p = Path(os.environ["AGRISMART_CHECKPOINT_PATH"])
            self.model_checkpoint_path = p if p.is_absolute() else get_project_root() / p

        self.reports_dir.mkdir(parents=True, exist_ok=True)


# Global configuration instance
config = MLConfig()