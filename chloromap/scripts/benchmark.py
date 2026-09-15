#!/usr/bin/env python
"""Benchmark model load, preprocessing, and inference latency.

Usage:
    python scripts/benchmark.py --checkpoint weights/best_model.pth
    python scripts/benchmark.py --checkpoint ... --image sample.jpg --iterations 25
    python scripts/benchmark.py --checkpoint ... --iterations 50 --json
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chloromap.inference.predictor import Predictor  # noqa: E402
from chloromap.inference.preprocessing import build_tensor, load_image_pil  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark inference latency")
    parser.add_argument(
        "--checkpoint",
        default=str(Path(__file__).resolve().parents[1] / "weights" / "best_model.pth"),
    )
    parser.add_argument("--image", default=None, help="optional real image")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--warmup", type=int, default=3)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not Path(args.checkpoint).exists():
        print(f"ERROR: checkpoint not found: {args.checkpoint}")
        return 1

    # --- model load time ---
    t0 = time.perf_counter()
    predictor = Predictor(args.checkpoint, device=args.device)
    load_time = time.perf_counter() - t0
    device = str(predictor.device)

    # --- preprocessing (single image) ---
    if args.image is not None:
        image = load_image_pil(args.image)
        t0 = time.perf_counter()
        tensor = build_tensor(image, predictor.image_size).to(predictor.device)
        preprocess_time = time.perf_counter() - t0
    else:
        tensor = torch.randn(1, 3, predictor.image_size, predictor.image_size,
                             device=predictor.device)
        preprocess_time = 0.0

    # --- warmup ---
    for _ in range(args.warmup):
        predictor.predict_tensor(tensor)

    # --- timed iterations (CPU + GPU sync) ---
    latencies = []
    for _ in range(args.iterations):
        t0 = time.perf_counter()
        predictor.predict_tensor(tensor)
        if device.startswith("cuda"):
            torch.cuda.synchronize()
        latencies.append(time.perf_counter() - t0)

    gpu_mem = None
    if device.startswith("cuda"):
        gpu_mem = {
            "allocated_mb": round(torch.cuda.memory_allocated() / 1e6, 1),
            "reserved_mb": round(torch.cuda.memory_reserved() / 1e6, 1),
            "gpu_name": torch.cuda.get_device_name(0),
        }

    report = {
        "checkpoint": str(Path(args.checkpoint)),
        "device": device,
        "model_load_seconds": round(load_time, 4),
        "preprocessing_seconds": round(preprocess_time, 4),
        "iterations": args.iterations,
        "warmup": args.warmup,
        "avg_latency_ms": round(statistics.mean(latencies) * 1000, 3),
        "median_latency_ms": round(statistics.median(latencies) * 1000, 3),
        "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)] * 1000, 3),
        "min_latency_ms": round(min(latencies) * 1000, 3),
        "max_latency_ms": round(max(latencies) * 1000, 3),
    }
    if gpu_mem:
        report["gpu_memory"] = gpu_mem

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        for k, v in report.items():
            print(f"{k:24s} {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())