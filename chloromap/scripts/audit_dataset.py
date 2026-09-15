#!/usr/bin/env python
"""Dataset audit script.

Usage:
    python scripts/audit_dataset.py [--data-dir ../data/raw/plantvillage]
                                    [--out reports/final/dataset_audit.json]
                                    [--split-dir ../data/processed]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running from the ml/ directory without installation
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chloromap.data.audit import audit_dataset, print_audit  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit a crop-disease image dataset")
    parser.add_argument("--data-dir", default="../data/raw/plantvillage",
                        help="root dir with class-name sub-folders")
    parser.add_argument("--out", default="reports/final/dataset_audit.json",
                        help="machine-readable audit output path")
    parser.add_argument("--min-dimension", type=int, default=32,
                        help="minimum image width/height to be considered healthy")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"ERROR: data directory does not exist: {data_dir}")
        return 1

    report = audit_dataset(data_dir, min_dimension=args.min_dimension)
    print_audit(report)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w") as fh:
        json.dump(report.to_dict(), fh, indent=2)
    print(f"Audit written to: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())