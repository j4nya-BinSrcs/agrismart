#!/usr/bin/env python
"""Prepare the dataset: apply an official split if present, otherwise a
deterministic stratified train/val split.

Usage:
    python scripts/prepare_dataset.py
    python scripts/prepare_dataset.py --data-dir ../data/raw/plantvillage \
                                      --out-dir ../data/processed \
                                      --val-ratio 0.15 --seed 42
    python scripts/prepare_dataset.py --no-dedupe   # keep exact duplicate files
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chloromap.data.audit import audit_dataset  # noqa: E402
from chloromap.data.split import stratified_split  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a deterministic train/val split")
    parser.add_argument("--data-dir", default="../data/raw/plantvillage")
    parser.add_argument("--out-dir", default="../data/processed")
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-audit", action="store_true")
    parser.add_argument(
        "--dedupe", action=argparse.BooleanOptionalAction, default=True,
        help="Drop byte-for-byte duplicate images within each class before splitting "
             "(prevents train/val leakage from identical files). Default: on. "
             "Use --no-dedupe to disable.",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"ERROR: data dir not found: {data_dir}")
        return 1

    if not args.skip_audit:
        report = audit_dataset(data_dir)
        if report.total_images == 0:
            print("ERROR: audit found no usable images. Aborting split.")
            return 1

    stats = stratified_split(data_dir, Path(args.out_dir),
                             val_ratio=args.val_ratio, seed=args.seed,
                             dedupe=args.dedupe)

    total_dup = stats.get("duplicates_dropped_total", 0)
    print(f"Train: {stats['train_count']}  Val: {stats['val_count']}  "
          f"Total: {stats['total']}  Duplicates dropped: {total_dup}")
    summary = Path(args.out_dir) / "split_summary.json"
    with summary.open("w") as fh:
        json.dump(stats, fh, indent=2)
    print(f"Split summary: {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())