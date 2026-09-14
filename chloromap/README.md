# Chloromap AI — ML Subsystem

Computer-vision crop disease classification for AgriSmart AI (SIH 2026).

This subsystem answers exactly one ML question:

> Given an image of a plant leaf, which disease (or healthy state) does it belong to?

It is deliberately decoupled from the rest of AgriSmart (weather, irrigation,
Gemini advisor, etc.). The classifier outputs a class + confidence; any
agricultural guidance is the responsibility of the application layer.

**Primary metric: Macro-F1.** Accuracy is secondary.

---

## Overview

- Model: **EfficientNetV2-S** (`tf_efficientnetv2_s`, `timm`), ImageNet-pretrained
- Input: RGB 224×224, ImageNet normalization
- Train/val: organizer-specified PlantVillage-style data (never field test data)
- Held-out judging set (PlantDoc-style field images) is **never touched** during development
- Pipeline: audit → split → train → evaluate → predict → serve → test
- Metrics: Macro-F1 (primary), accuracy, per-class P/R/F1, confusion matrix
- Reproducibility: fixed seeds, recorded configs, machine-readable artifacts

## Architecture

```text
FastAPI  →  Predictor  →  EfficientNetV2-S backbone → classification head → N logits
              │
              └─ deterministic validation preprocessing (Resize→CenterCrop→ToTensor→norm)
```

## Requirements

- Linux, NVIDIA GPU with ~4 GB VRAM (target: NVIDIA T1200 Laptop GPU)
- NVIDIA driver with CUDA 12.x/13.x support
- [`uv`](https://docs.astral.sh/uv/) (Python project manager)
- Python 3.13

## Environment setup

A project-local `.venv` is used; the system PyTorch is **not** used.

```bash
cd ~/Documents/AgriSmart
uv venv --python 3.13
source .venv/bin/activate
python --version        # must print from the project .venv

# CUDA-enabled PyTorch (from the local PyTorch index, not PyPI)
uv pip install torch==2.14.0+cu132 torchvision==0.29.0+cu132 \
    --index-url https://download.pytorch.org/whl/cu132

# Remaining ML dependencies
uv pip install -r ml/requirements.txt
```

### CUDA verification

```bash
python -c "
import torch
print(torch.__version__)                 # 2.14.0+cu132
print(torch.version.cuda)                # 13.2
print(torch.cuda.is_available())         # True
print(torch.cuda.get_device_name(0))     # NVIDIA T1200 Laptop GPU
"
```

Run a matrix-multiply smoke test before any real training.

## Dataset setup

See [`data/README.md`](../data/README.md) for the source, license, layout, and
class mapping. Dataset rules:

- Place organizer data under `data/raw/`.
- **Never** train, tune, or select on the held-out judging set.
- Preserve an official train/val split if one is supplied; otherwise use
  `scripts/prepare_dataset.py` (deterministic stratified, seeded).

### Dataset audit

```bash
cd ml
python scripts/audit_dataset.py                          # default path
python scripts/audit_dataset.py --data-dir ../data/raw/plantvillage
```

Writes `ml/reports/final/dataset_audit.json` and a printed summary. The audit
**never modifies data** — problems are reported, not silently repaired.

### Prepare split

```bash
python scripts/prepare_dataset.py \
    --data-dir ../data/raw/plantvillage \
    --out-dir ../data/processed \
    --val-ratio 0.15 --seed 42
```

## Training

Configuration lives in YAML; the CLI overrides individual knobs.

```bash
cd ml
python scripts/train.py --config configs/baseline.yaml        # frozen backbone baseline
python scripts/train.py --config configs/final.yaml           # fine-tuned final
```

Common overrides:

```bash
python scripts/train.py --config configs/baseline.yaml \
    --epochs 15 --batch-size 16 --seed 42 --device cuda
```

Training loop features: AdamW, optional cosine scheduler, AMP (auto fallback to
fp32 on CPU), Macro-F1 checkpointing, per-epoch logging, experiment records in
`ml/reports/experiments/*.json`. Best checkpoint → `ml/weights/best_model.pth`.

## Evaluation

```bash
python scripts/evaluate.py --checkpoint ml/weights/best_model.pth
```

Produces:

- `ml/reports/final/metrics.json` — machine-readable metrics
- `ml/reports/final/model_report.md` — human-readable report
- `ml/reports/figures/confusion_matrix.png` — automatically generated

## Prediction

```bash
python scripts/predict.py --image path/to/leaf.jpg
python scripts/predict.py --image path/to/leaf.jpg --json
python scripts/predict.py --image path/to/leaf.jpg --top-k 3 --json
```

Programmatic interface:

```python
from chloromap.inference.predictor import Predictor

predictor = Predictor("ml/weights/best_model.pth")
result = predictor.predict("leaf.jpg")   # {class_id, class_name, confidence}
```

## Inference API

```bash
python scripts/serve.py --port 8000
# or
uvicorn chloromap.api:app --host 0.0.0.0 --port 8000
```

Endpoints:

```text
GET  /health           diagnostics (status, model loaded, device)
GET  /metadata         model & checkpoint info (classes, image size, val metrics)
POST /predict          predict (multipart/form-data, field name: image)
POST /api/v1/predict   versioned alias of /predict (used by the MERN frontend)
```

The model is loaded **once** at startup. Predictions run in a threadpool so the
event loop stays responsive under concurrent uploads. Uploads are size-limited
(10 MB) and MIME-validated; images above 40 MP (decompression bombs) are
rejected with a 413, EXIF orientation is applied before classification, and CORS
is enabled for cross-origin MERN calls. Structured errors are returned, never
stack traces, and no images are stored or logged.

CORS origins default to `*`; restrict with the `AGRISMART_CORS_ORIGINS`
environment variable (comma-separated), e.g.
`AGRISMART_CORS_ORIGINS=https://app.agrismart.com python scripts/serve.py`.

Request:

```bash
curl -X POST http://localhost:8000/predict \
     -F "image=@leaf.jpg"
```

Response:

```json
{
  "class_id": 17,
  "class_name": "Tomato___Early_blight",
  "confidence": 0.91
}
```

`GET /metadata`:

```json
{
  "model_name": "tf_efficientnet_b0",
  "checkpoint": "ml/weights/best_model.pth",
  "num_classes": 15,
  "class_names": ["Apple___Apple_scab", "..."],
  "image_size": 224,
  "device": "cuda",
  "validation_macro_f1": 0.987,
  "validation_accuracy": 0.993,
  "best_epoch": 9
}
```

## Testing

```bash
cd ml
python -m pytest            # 50+ tests, synthetic fixtures, no dataset needed
```

## Benchmarking

```bash
python scripts/benchmark.py --checkpoint ml/weights/best_model.pth
python scripts/benchmark.py --checkpoint ... --image leaf.jpg --iterations 50 --json
```

Reports model-load, preprocessing, and inference latency (avg / median / p95)
plus GPU memory where available. Numbers are measured, never claims.

## Project structure

```text
ml/
├── configs/                # baseline.yaml, final.yaml
├── src/chloromap/
│   ├── config.py           # TrainConfig (YAML-backed)
│   ├── seed.py             # deterministic seeding
│   ├── data/               # dataset, transforms, split, audit
│   ├── models/             # EfficientNetV2-S factory + heads
│   ├── training/           # trainer, losses, schedulers
│   ├── evaluation/         # metrics, confusion matrix, report
│   └── inference/          # predictor, preprocessing
├── scripts/                # audit / prepare / train / evaluate / predict / benchmark / serve
├── weights/                # checkpoints (git-ignored)
├── reports/                # experiments/, figures/, final/ (git-ignored where large)
├── logs/
└── tests/                  # unit tests (synthetic fixtures)
```

## Reproducibility

Every run records: dataset + split, seeds, model + pretrained weights, image
size, augmentations, optimizer/LR/weight-decay, scheduler, batch size, epochs,
device, AMP status, and resulting validation metrics. The seed is set for
Python, NumPy, PyTorch, and CUDA. Bit-for-bit reproducibility across machines
is **not** guaranteed (GPU nondeterminism); we record everything needed to
re-run an experiment and to reproduce inference exactly from a checkpoint.

## Limitations

- Lab→field domain shift: trained on PlantVillage-style clean imagery; held-out
  PlantDoc-style field images are the competition protocol and are excluded
  from development.
- Softmax confidence is calibrated for classification, not for severity or
  treatment decisions.
- Similar-looking diseases may be confused; see the confusion matrix.
- Class imbalance and image quality affect performance — see audit + report.
- Unknown test on this developer machine: confidences are a ranking signal, not
  verified certainty.