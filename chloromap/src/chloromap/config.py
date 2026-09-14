from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional


@dataclass
class TrainConfig:
    """All training hyper-parameters and paths.

    Values can be loaded from / saved to YAML via :pymeth:`TrainConfig.from_yaml`
    and :pymeth:`TrainConfig.to_yaml`.
    """

    # --- paths ---
    data_dir: str = "../data/raw/plantvillage"
    output_dir: str = "../ml/weights"
    reports_dir: str = "../ml/reports"

    # --- model ---
    model_name: str = "tf_efficientnetv2_s"
    pretrained: bool = True
    num_classes: int = 0  # set from dataset at runtime

    # --- image ---
    image_size: int = 224

    # --- training ---
    epochs: int = 20
    batch_size: int = 16
    num_workers: int = 4

    # --- optimiser ---
    optimizer: str = "AdamW"
    learning_rate: float = 1e-3
    weight_decay: float = 1e-4

    # --- scheduler ---
    scheduler: str = "cosine"
    T_max: Optional[int] = None  # defaults to epochs
    warmup_epochs: int = 0  # linear warmup for "warmup_cosine" scheduler

    # --- loss ---
    loss: str = "CrossEntropyLoss"
    label_smoothing: float = 0.0
    focal_gamma: float = 2.0
    class_weights: Optional[list] = None  # optional per-class weights (weighted CE / focal)

    # --- augmentation ---
    augmentation: str = "mild"
    mixup_alpha: float = 0.0
    erasing: float = 0.0  # RandomErasing probability in train transforms

    # --- training strategy ---
    stage: str = "baseline"  # baseline | finetune
    freeze_backbone: bool = True
    unfreeze_from_layer: Optional[str] = None
    balanced_sampling: bool = False  # class-balanced WeightedRandomSampler for train

    # --- reproducibility ---
    seed: int = 42

    # --- mixed precision ---
    use_amp: bool = True

    # --- device ---
    device: str = "auto"

    # --- bookkeeping ---
    experiment_id: str = ""
    experiment_name: str = ""
    notes: str = ""

    # ------------------------------------------------------------------
    def __post_init__(self) -> None:
        if not self.experiment_id:
            self.experiment_id = f"exp_{self.stage}_{self.augmentation}"
        if not self.T_max:
            self.T_max = self.epochs

    # ------------------------------------------------------------------
    @classmethod
    def from_yaml(cls, path: str | Path) -> "TrainConfig":
        import yaml

        path = Path(path)
        with path.open() as fh:
            raw = yaml.safe_load(fh) or {}

        # Flatten nested groups for convenience
        flat: dict = {}
        for block in ("data", "model", "image", "training", "optimizer",
                       "scheduler", "loss", "augmentation", "stage",
                       "reproducibility", "mixed_precision", "device",
                       "bookkeeping"):
            sub = raw.get(block, {})
            if isinstance(sub, dict):
                flat.update(sub)
        # top-level keys override
        flat.update({k: v for k, v in raw.items() if isinstance(v, (int, float, str, bool, list))})

        return cls(**{k: v for k, v in flat.items() if k in cls.__dataclass_fields__})

    # ------------------------------------------------------------------
    def to_yaml(self, path: str | Path) -> None:
        import yaml

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {k: v for k, v in asdict(self).items()}
        with path.open("w") as fh:
            yaml.safe_dump(data, fh, sort_keys=False, default_flow_style=False)

    # ------------------------------------------------------------------
    def to_json(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w") as fh:
            json.dump(asdict(self), fh, indent=2)
