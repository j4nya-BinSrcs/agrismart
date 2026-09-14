"""Deterministic train / validation split utilities."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from .audit import file_hash


def stratified_split(
    data_dir: str | Path,
    output_dir: str | Path,
    val_ratio: float = 0.15,
    seed: int = 42,
    dedupe: bool = False,
) -> dict:
    """Create a deterministic stratified train/val split.

    Parameters
    ----------
    data_dir : source directory with class-name sub-folders.
    output_dir : root that will contain ``train/`` and ``val/``.
    val_ratio : fraction of each class reserved for validation.
    seed : reproducibility seed.
    dedupe : when True, drop byte-for-byte duplicate images *within each
        class* before splitting. Keeps the first-seen file per content hash
        and records how many were dropped. This prevents the same image
        from leaking into both train and val.

    Returns
    -------
    dict with split statistics (incl. ``duplicates_dropped`` counts).
    """
    import random

    data_dir = Path(data_dir)
    output_dir = Path(output_dir)
    rng = random.Random(seed)

    train_dir = output_dir / "train"
    val_dir = output_dir / "val"

    stats: dict = {
        "seed": seed,
        "val_ratio": val_ratio,
        "dedupe": dedupe,
        "classes": {},
        "duplicates_dropped_total": 0,
    }

    class_dirs = sorted([d for d in data_dir.iterdir() if d.is_dir()])

    for cd in class_dirs:
        images = sorted([f for f in cd.iterdir() if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}])

        dropped = 0
        if dedupe:
            seen_hashes: set[str] = set()
            kept: list[Path] = []
            for f in images:
                h = file_hash(f)
                if h in seen_hashes:
                    dropped += 1
                    continue
                seen_hashes.add(h)
                kept.append(f)
            images = kept

        if not images:
            stats["classes"][cd.name] = {
                "total": 0,
                "dedupe_dropped": dropped,
                "train": 0,
                "val": 0,
            }
            continue

        indices = list(range(len(images)))
        rng.shuffle(indices)
        n_val = max(1, int(len(images) * val_ratio))
        val_idx = set(indices[:n_val])

        # Create output dirs
        for split_name, split_dir in [("train", train_dir), ("val", val_dir)]:
            class_out = split_dir / cd.name
            class_out.mkdir(parents=True, exist_ok=True)

        for i, img in enumerate(images):
            split = "val" if i in val_idx else "train"
            dst = (output_dir / split / cd.name) / img.name
            if not dst.exists():
                shutil.copy2(img, dst)

        stats["classes"][cd.name] = {
            "total": len(images),
            "dedupe_dropped": dropped,
            "train": len(images) - n_val,
            "val": n_val,
        }
        stats["duplicates_dropped_total"] += dropped

    stats["total"] = sum(v["total"] for v in stats["classes"].values())
    stats["train_count"] = sum(v["train"] for v in stats["classes"].values())
    stats["val_count"] = sum(v["val"] for v in stats["classes"].values())

    summary_path = output_dir / "split_summary.json"
    with summary_path.open("w") as fh:
        json.dump(stats, fh, indent=2)

    return stats
