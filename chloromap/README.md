# Chloromap — Crop Disease Classification Subsystem

Computer-vision crop disease classification for AgriSmart AI (SIH 2026).

This subsystem answers exactly one ML question:

> Given an image of a plant leaf, which disease (or healthy state) does it belong to?

It is deliberately decoupled from the rest of AgriSmart (weather, irrigation,
Gemini advisor, etc.). The classifier outputs a class + confidence; any
agricultural guidance is the responsibility of the application layer.

**Primary metric: Macro-F1.** Accuracy is secondary.

---

## Problem-Statement Compliance (SIH 2026)

### Dataset transparency & licences
- **PlantVillage** (Mohanty et al., 2016) — 54,305 lab-condition images, **CC BY-SA 3.0**.
  - Source: GitHub `spMohanty/PlantVillage-Dataset` (mirror of original dataset).
  - Hugging Face mirror: `mohanty/PlantVillage`, `geraldmc/plantvillage-full`.
  - Only the **shared class list** classes from the problem statement are used (see `configs/class_spec.yaml`).
- **PlantDoc** (Kayal et al., 2020) — 2,572 field-condition images, **CC BY 4.0**.
  - Source: GitHub `pratikkayal/PlantDoc-Dataset`.
  - Hugging Face mirror: `geraldmc/plantdoc-full`.
  - Used for out-of-distribution adaptation/evaluation only — never for training the primary model.

Both datasets are downloaded at build time by `scripts/build_dataset.py` and are **never committed** (see `.gitignore`).

### Originality & AI assistance
This subsystem was **bootstrapped from Google AI Studio** with human architectural direction and subsequent manual engineering:
- **Human-value-added steps** (non-exhaustive):
  - Problem-statement interpretation, class-list design, compliance checklist.
  - Self-contained PyTorch subsystem design with deterministic scripts, YAML configs, FastAPI inference wrapper.
  - EfficientNet factory with class-agnostic configs, balanced sampling, mixup/erasing, warmup-cosine.
  - FastAPI inference service with CORS, size limits, threadpool, structured errors.
  - Reproducibility: fixed seeds, recorded configs, experiment tracking.
  - Tests: 50+ pytest unit tests with synthetic fixtures (no dataset required).

> AI Studio generated scaffolding; every file was reviewed, refactored, and extended by hand to meet the SIH rubric.

---

## Overview

- Backbone: **EfficientNet** from `timm` (baseline: `tf_efficientnetv2_s`,
  final model: `tf_efficientnetv2_s`), ImageNet-pretrained
- Input: RGB 224×224, ImageNet normalization
- Train/val: organizer-specified PlantVillage-style data (never field test data)
- **Canonical classes:** 25 (10 new: Corn/Apple/Grape + 15 legacy solanaceae) — see `configs/class_spec.yaml`
- Held-out judging set (PlantDoc-style field images) is **never touched** during development
- Pipeline: audit → split → train → evaluate → predict → serve → test
- Metrics: Macro-F1 (primary), accuracy, per-class P/R/F1, confusion matrix
- Reproducibility: fixed seeds, recorded configs, machine-readable artifacts
- Final 25-class model metrics: **TBD after retraining** (see `reports/final/model_report.md`)
- Backup 15-class solanaceae checkpoint: `weights/best_model.pth.solanaceae15.pth` (git-ignored)

## Architecture

```text
FastAPI  →  Predictor  →  EfficientNet backbone → classification head → 15 logits
              │
              └─ deterministic validation preprocessing (Resize→CenterCrop→ToTensor→norm)
```

## Requirements

- Linux, NVIDIA GPU with ~4 GB VRAM (tested on NVIDIA T1200 Laptop GPU)
- NVIDIA driver with CUDA 12.x/13.x support
- Python 3.13
- [`uv`](https://docs.astral.sh/uv/) (project manager; lockfile `uv.lock` provided)

## Setup

A project-local virtualenv is used; the system Python is **not** used.

```bash
cd chloromap
uv sync                      # creates .venv from pyproject.toml / uv.lock
source .venv/bin/activate
python --version             # must print 3.13 from the project .venv
```

CUDA verification:

```bash
python -c "
import torch
print(torch.__version__)        # 2.14.0+cu132
print(torch.cuda.is_available())  # True
print(torch.cuda.get_device_name(0))
"
```

Run a matrix-multiply smoke test before any real training.

## Dataset setup

Place organizer data under `data/raw/` **relative to the AgriSmart repo root**
(configs use `../data/raw/plantvillage` from `chloromap/configs/`). Rules:

- **Never** train, tune, or select on the held-out judging set.
- Preserve an official train/val split if one is supplied; otherwise use
  `scripts/prepare_dataset.py` (deterministic stratified, seeded).

### Audit

```bash
python scripts/audit_dataset.py --data-dir ../data/raw/plantvillage
```

Writes `reports/final/dataset_audit.json`. The audit **never modifies data**.

### Prepare split

```bash
python scripts/prepare_dataset.py \
    --data-dir ../data/raw/plantvillage \
    --out-dir ../data/processed \
    --val-ratio 0.15 --seed 42
```

## Training

```bash
python scripts/train.py --config configs/baseline.yaml   # frozen-backbone baseline
python scripts/train.py --config configs/final.yaml      # fine-tuned final
```

CLI overrides: `--epochs`, `--batch-size`, `--seed`, `--device`, etc.

- AdamW, optional warmup+cosine scheduler, mixup / random erasing (final config)
- Class-balanced sampling for rare classes
- Macro-F1 checkpointing; best checkpoint → `weights/best_model.pth`
- Experiment records in `reports/experiments/*.json`

## Evaluation

```bash
python scripts/evaluate.py --checkpoint weights/best_model.pth
```

Produces:

- `reports/final/metrics.json` — machine-readable metrics
- `reports/final/model_report.md` — human-readable report
- `reports/figures/confusion_matrix.png`

## Prediction

```bash
python scripts/predict.py --image path/to/leaf.jpg
python scripts/predict.py --image path/to/leaf.jpg --top-k 3 --json
```

Programmatic interface:

```python
from chloromap.inference.predictor import Predictor

predictor = Predictor("weights/best_model.pth")
result = predictor.predict("leaf.jpg")   # {class_id, class_name, confidence}
```

## Inference API

```bash
python scripts/serve.py --port 8000                    # default checkpoint
python scripts/serve.py --checkpoint weights/best_model.pth --port 8080
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
rejected (413), EXIF orientation is applied, and CORS is enabled. Structured
errors are returned (never stack traces); no images are stored or logged.

Restrict CORS origins via `CHLOROMAP_CORS_ORIGINS` (comma-separated), e.g.
`CHLOROMAP_CORS_ORIGINS=https://app.agrismart.com python scripts/serve.py`.

Request:

```bash
curl -X POST http://localhost:8000/predict -F "image=@leaf.jpg"
```

Response:

```json
{
  "class_id": 17,
  "class_name": "Tomato___Early_blight",
  "confidence": 0.91
}
```

## Testing

```bash
uv run pytest        # 50+ tests, synthetic fixtures, no dataset needed
```

## Benchmarking

```bash
python scripts/benchmark.py --checkpoint weights/best_model.pth
python scripts/benchmark.py --image leaf.jpg --iterations 50 --json
```

Reports model-load, preprocessing, and inference latency plus GPU memory.
Numbers are measured, never claims.

## Project structure

```text
chloromap/
├── configs/                # baseline.yaml, final.yaml
├── src/chloromap/
│   ├── config.py           # TrainConfig (YAML-backed)
│   ├── seed.py             # deterministic seeding
│   ├── data/               # dataset, transforms, split, audit
│   ├── models/             # EfficientNet factory + heads
│   ├── training/           # trainer, losses, schedulers
│   ├── evaluation/         # metrics, confusion matrix, report
│   └── inference/          # predictor, preprocessing
│   └── api.py              # FastAPI inference service
├── scripts/                # audit / prepare / train / evaluate / predict / benchmark / serve
├── weights/                # checkpoints (*.pth.baseline git-ignored)
├── reports/                # experiments/, figures/, final/
├── logs/
├── tests/                  # pytest suites
├── pyproject.toml          # project metadata + tool config
├── requirements.txt        # pinned dependency list (incl. CUDA torch)
└── uv.lock
```

## Reproducibility

Every run records: dataset + split, seeds, model + pretrained weights, image
size, augmentations, optimizer/LR/weight-decay, scheduler, batch size, epochs,
device, AMP status, and resulting validation metrics. Seeds are set for Python,
NumPy, PyTorch, and CUDA. Bit-for-bit reproducibility across machines is **not**
guaranteed (GPU nondeterminism); inference is reproducible from a checkpoint.

## Limitations

- Lab→field domain shift: trained on PlantVillage-style clean imagery; the
  held-out PlantDoc-style field images are the competition protocol.
- Softmax confidence is calibrated for classification, not for severity or
  treatment decisions.
- Similar-looking diseases may be confused; see the confusion matrix.
- Class imbalance and image quality affect performance — see audit + report.