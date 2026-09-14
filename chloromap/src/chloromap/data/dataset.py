"""Image classification dataset for PlantVillage / PlantDoc style data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image
from torch.utils.data import Dataset
from torchvision.transforms import Compose


class CropDiseaseDataset(Dataset):
    """
    Expects a directory structure::

        root/
          class_name/
            img_001.jpg
            img_002.jpg
          ...

    The class mapping is either supplied explicitly or inferred from
    the sorted sub-directory names.
    """

    def __init__(
        self,
        root: str | Path,
        transform: Optional[Compose] = None,
        class_to_idx: Optional[dict[str, int]] = None,
    ) -> None:
        self.root = Path(root)
        self.transform = transform

        # Build class → index mapping from sorted directory list
        class_dirs = sorted([d for d in self.root.iterdir() if d.is_dir()])
        if class_to_idx is None:
            self.class_to_idx = {d.name: i for i, d in enumerate(class_dirs)}
        else:
            self.class_to_idx = class_to_idx

        # Index → class
        self.idx_to_class: dict[int, str] = {v: k for k, v in self.class_to_idx.items()}

        # Scan all valid images
        self.samples: list[Tuple[Path, int]] = []
        extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
        for d in class_dirs:
            if d.name not in self.class_to_idx:
                continue
            label = self.class_to_idx[d.name]
            for img_path in sorted(d.iterdir()):
                if img_path.suffix.lower() in extensions and img_path.stat().st_size > 0:
                    self.samples.append((img_path, label))

    # ------------------------------------------------------------------
    def __len__(self) -> int:
        return len(self.samples)

    # ------------------------------------------------------------------
    def __getitem__(self, idx: int) -> Tuple:
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, label

    # ------------------------------------------------------------------
    @property
    def num_classes(self) -> int:
        return len(self.class_to_idx)

    @property
    def classes(self) -> list[str]:
        return [k for k, v in sorted(self.class_to_idx.items(), key=lambda x: x[1])]

    def save_class_mapping(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        mapping = {i: name for name, i in sorted(self.class_to_idx.items(), key=lambda x: x[1])}
        with path.open("w") as fh:
            json.dump(mapping, fh, indent=2)

    @classmethod
    def load_class_mapping(cls, path: str | Path) -> dict[str, int]:
        with open(path) as fh:
            mapping = json.load(fh)
        return {v: int(k) for k, v in mapping.items()}
