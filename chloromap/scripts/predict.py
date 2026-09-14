#!/usr/bin/env python
"""Predict the class of an image.

Usage:
    python scripts/predict.py --image leaf.jpg
    python scripts/predict.py --image leaf.jpg --json
    python scripts/predict.py --image leaf.jpg --top-k 3 --json
    python scripts/predict.py --image leaf.jpg --checkpoint ml/weights/best_model.pth
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chloromap.inference.predictor import Predictor  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify a single image")
    parser.add_argument("--image", required=True, help="path to an image file")
    parser.add_argument("--checkpoint", default="../ml/weights/best_model.pth")
    parser.add_argument("--top-k", type=int, default=1)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()

    if not Path(args.image).exists():
        print(f"ERROR: image not found: {args.image}")
        return 1
    if not Path(args.checkpoint).exists():
        print(f"ERROR: checkpoint not found: {args.checkpoint}")
        return 1
    if args.top_k < 1:
        print("ERROR: --top-k must be >= 1")
        return 1

    predictor = Predictor(args.checkpoint, device=args.device)
    result = predictor.predict(args.image, top_k=args.top_k)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if args.top_k == 1:
            # Crop is the token before the first underscore in the class name
            # (handles inconsistent separators: Pepper__bell___..., Tomato_Early_blight, ...)
            print(f"Crop: {result['class_name'].split('_')[0]}")
            print(f"Prediction: {result['class_name']}")
            print(f"Confidence: {result['confidence']:.2f}")
        else:
            for i, p in enumerate(result["predictions"], 1):
                print(f"{i}. {p['class_name']}  ({p['confidence']:.4f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())