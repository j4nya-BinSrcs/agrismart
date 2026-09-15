#!/usr/bin/env python
"""Build the consolidated canonical training dataset.

Merges the previous 15-class solanaceae set with the newly added
Corn/Apple/Grape classes into a single root with uniform
`Crop___Disease` (PlantVillage-style) directory names as declared in
``configs/class_spec.yaml``.

Usage:
    python scripts/build_dataset.py \
        --class-spec configs/class_spec.yaml \
        --out-dir ../data/raw/plantvillage \
        --pv-color-dir /path/to/PlantVillage-Dataset/raw/color \
        --legacy-dir /path/to/previous/plantvillage

Resolution order for the source of each class:
    1. PlantVillage raw/color directory (new classes: Corn/Apple/Grape)
    2. legacy solanaceae directory (previous 15 classes)
Legacy sources are symlinked (zero-copy); PlantVillage sources are copied
because they are fetched into a temporary sparse clone.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the canonical dataset root")
    parser.add_argument("--class-spec", default="configs/class_spec.yaml")
    parser.add_argument("--out-dir", default="../data/raw/plantvillage")
    parser.add_argument("--pv-color-dir", default=None,
                        help="PlantVillage-Dataset/raw/color (new crops)")
    parser.add_argument("--legacy-dir", default=None,
                        help="previous 15-class solanaceae dataset root")
    parser.add_argument("--copy-all", action="store_true",
                        help="copy instead of symlink legacy sources")
    args = parser.parse_args()

    spec_path = Path(args.class_spec)
    if not spec_path.exists():
        print(f"ERROR: class spec not found: {spec_path}")
        return 1
    spec = yaml.safe_load(spec_path) or {}
    classes = spec.get("classes", {})
    if not classes:
        print("ERROR: no classes in spec")
        return 1

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    pv_dir = Path(args.pv_color_dir) if args.pv_color_dir else None
    legacy_dir = Path(args.legacy_dir) if args.legacy_dir else None

    missing: list[str] = []
    for canonical, source in classes.items():
        dest = out_dir / canonical
        if dest.exists():
            print(f"skip (already present)      {canonical}")
            continue

        src = None
        from_legacy = False
        if pv_dir is not None and (pv_dir / source).is_dir():
            src = pv_dir / source
        elif legacy_dir is not None and (legacy_dir / source).is_dir():
            src = legacy_dir / source
            from_legacy = True
        else:
            missing.append(canonical)
            print(f"MISSING source for           {canonical} ({source})")
            continue

        if from_legacy and not args.copy_all:
            dest.symlink_to(src, target_is_directory=True)
            print(f"symlink (legacy solanaceae)  {canonical} -> {src}")
        else:
            shutil.copytree(src, dest)
            print(f"copy (PlantVillage)          {canonical} <- {src}")

    if missing:
        print(f"\nWARNING: {len(missing)} classes had no source: {missing}")
        return 1
    print(f"\nBuilt {len(classes)} canonical classes under {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())