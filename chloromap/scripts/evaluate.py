#!/usr/bin/env python
"""Evaluate a saved checkpoint.

Usage:
    python scripts/evaluate.py --checkpoint weights/best_model.pth
    python scripts/evaluate.py --checkpoint weights/best_model.pth --val-dir ../data/processed/val
    python scripts/evaluate.py --checkpoint ... --reports-dir reports/final
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chloromap.evaluation.report import build_evaluation_artifacts  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate a checkpoint and write reports")
    parser.add_argument("--checkpoint", required=True, help="path to best_model.pth")
    parser.add_argument("--val-dir", default="../data/processed/val",
                        help="validation directory with class-name sub-folders")
    parser.add_argument("--reports-dir", default="reports/final")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--summary-json", default=None,
                        help="optional JSON with task/approach/dataset/baseline/limitations "
                             "sections for the one-page model report")
    args = parser.parse_args()

    if not Path(args.checkpoint).exists():
        print(f"ERROR: checkpoint not found: {args.checkpoint}")
        return 1
    if not Path(args.val_dir).exists():
        print(f"ERROR: validation dir not found: {args.val_dir}")
        return 1

    summary = None
    if args.summary_json:
        s_path = Path(args.summary_json)
        if not s_path.exists():
            print(f"ERROR: summary json not found: {s_path}")
            return 1
        summary = json.loads(s_path.read_text())

    result = build_evaluation_artifacts(
        checkpoint=args.checkpoint,
        val_dir=args.val_dir,
        reports_dir=args.reports_dir,
        device=args.device,
        seed=args.seed,
        summary=summary,
    )

    print(f"\nMACRO-F1 : {result['macro_f1']:.4f}")
    print(f"ACCURACY : {result['accuracy']:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())