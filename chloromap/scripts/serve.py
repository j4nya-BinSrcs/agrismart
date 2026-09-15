#!/usr/bin/env python
"""Launch the FastAPI inference service.

Usage:
    python scripts/serve.py --port 8000
    python scripts/serve.py --checkpoint weights/best_model.pth --port 8080
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import uvicorn  # noqa: E402

_DEFAULT_CHECKPOINT = str(Path(__file__).resolve().parents[1] / "weights" / "best_model.pth")


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the disease classifier via FastAPI")
    parser.add_argument("--checkpoint", default=_DEFAULT_CHECKPOINT)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    checkpoint = str(Path(args.checkpoint).resolve())

    from chloromap import api
    predictor = api.load_model(checkpoint)
    print(f"Model loaded: device={predictor.device} classes={predictor.num_classes}")
    print(f"Serving on http://{args.host}:{args.port}  (GET /health, POST /predict)")

    uvicorn.run(api.app, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())