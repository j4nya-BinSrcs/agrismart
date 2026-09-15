# Chloromap — Crop Disease Classification

Chloromap is AgriSmart's self-contained computer-vision subsystem for **crop
disease classification**. It answers exactly one ML question:

> Given an image of a plant leaf, which disease (or healthy state) does it belong to?

It is deliberately decoupled from the rest of AgriSmart (weather, irrigation,
the Gemini advisor, sustainability, etc.). Chloromap returns a **class + a
confidence**; all agricultural guidance (severity, treatment, precautions) is
the responsibility of the application layer in `server/`.

- **Primary metric: Macro-F1.** Accuracy is secondary.
- **Stack:** PyTorch + `timm` EfficientNet, served over FastAPI.
- **Location:** [`chloromap/`](../chloromap/) — an independent Python project.

---

## 1. Introduction

Chloromap trains image classifiers on PlantVillage-derived crop/disease classes
and exposes them through a small, dependency-light HTTP inference service. The
design goals are:

- **Reproducibility** — every run records dataset/split, seeds, model weights,
  image size, augmentations, optimizer/scheduler, batch size, epochs, device,
  AMP status, and resulting validation metrics.
- **Determinism** — fixed seeds for Python, NumPy, PyTorch, and CUDA.
- **Decoupling** — the classifier is class-agnostic: the class list is data,
  not code (`configs/class_spec.yaml`).
- **Honesty** — benchmark numbers are measured, never claimed; softmax
  confidence is presented as classification confidence, not severity.

### Model architecture

```text
FastAPI  →  Predictor  →  EfficientNet backbone → classification head → N logits
              │
              └─ deterministic preprocessing
                 (Resize → CenterCrop → ToTensor → ImageNet normalize)
```

- **Backbone:** EfficientNet from `timm`.
  - Baseline: `tf_efficientnetv2_s` (frozen backbone).
  - Final/production: `tf_efficientnet_b0` (full fine-tune) — chosen because it
    reaches equivalent accuracy on PlantVillage at a fraction of the wall-clock
    and VRAM on the target GPU.
- **Input:** RGB, 224×224, ImageNet normalization.
- **Model is loaded once at startup** and reused for every request.

### Datasets

| Dataset | Images | Conditions | Licence | Role |
| :--- | :--- | :--- | :--- | :--- |
| **PlantVillage** (Mohanty et al., 2016) | 54,305 | Lab | CC BY-SA 3.0 | Training / validation |
| **PlantDoc** (Kayal et al., 2020) | 2,572 | Field | CC BY 4.0 | Out-of-distribution evaluation only — never trained on |

Both datasets are downloaded at build time by
`chloromap/scripts/build_dataset.py` and are **never committed** (see
`.gitignore`). The held-out judging set is never touched during development.

---

## 2. Classes Currently Supported

The service is **checkpoint-driven**: the number and names of classes are read
from the loaded `.pth` checkpoint at startup. There are two class scopes in the
repository:

### 2.1 Shipped production checkpoint — 15 classes

`chloromap/weights/best_model.pth` (experiment `final_004`) currently ships with
**15 Solanaceae-focused classes** across pepper, potato, and tomato:

| # | Class |
| :---: | :--- |
| 0 | `Pepper__bell___Bacterial_spot` |
| 1 | `Pepper__bell___healthy` |
| 2 | `Potato___Early_blight` |
| 3 | `Potato___Late_blight` |
| 4 | `Potato___healthy` |
| 5 | `Tomato_Bacterial_spot` |
| 6 | `Tomato_Early_blight` |
| 7 | `Tomato_Late_blight` |
| 8 | `Tomato_Leaf_Mold` |
| 9 | `Tomato_Septoria_leaf_spot` |
| 10 | `Tomato_Spider_mites_Two_spotted_spider_mite` |
| 11 | `Tomato__Target_Spot` |
| 12 | `Tomato__Tomato_YellowLeaf__Curl_Virus` |
| 13 | `Tomato__Tomato_mosaic_virus` |
| 14 | `Tomato_healthy` |

### 2.2 Canonical class spec — 25 classes

`chloromap/configs/class_spec.yaml` defines the full **25-class canonical list**
(10 new Corn/Apple/Grape classes plus the 15 legacy Solanaceae classes). This is
the target for the retrained model; class indices are resolved from the YAML
table and no code changes are required to retarget. The 10 additional canonical
classes are:

| Canonical class | PlantVillage source |
| :--- | :--- |
| `Apple___Apple_scab` | Apple___Apple_scab |
| `Apple___Black_rot` | Apple___Black_rot |
| `Apple___healthy` | Apple___healthy |
| `Corn___Common_rust` | Corn (maize)___Common_rust_ |
| `Corn___Gray_leaf_spot` | Corn (maize)___Cercospora_leaf_spot Gray_leaf_spot |
| `Corn___healthy` | Corn (maize)___healthy |
| `Grape___Black_rot` | Grape___Black_rot |
| `Grape___Esca_(Black_Measles)` | Grape___Esca_(Black_Measles) |
| `Grape___Leaf_blight_(Isariopsis_Leaf_Spot)` | Grape___Leaf_blight_(Isariopsis_Leaf_Spot) |
| `Grape___healthy` | Grape___healthy |

> The 15-class checkpoint is what the running FastAPI service currently answers
> with. The 25-class model is the retraining target; its metrics are marked TBD
> in `chloromap/reports/final/model_report.md` until retraining completes.

---

## 3. Benchmarks & Results

### 3.1 Validation metrics (15-class production checkpoint)

Measured on the held-out **validation split** of `data/raw/plantvillage`
(20,638 images, 15 classes). Source: `chloromap/reports/final/metrics.json`.

| Metric | Value |
| :--- | :--- |
| **Macro-F1 (primary)** | **0.9422** |
| Accuracy (secondary) | 0.9501 |
| Macro-Precision | 0.9387 |
| Macro-Recall | 0.9491 |
| Best epoch | 12 / 12 |
| Checkpoint | `weights/best_model.pth` |

### 3.2 Baseline vs. final

| Experiment | Model | Stage | Epochs | Val Macro-F1 | Val Accuracy |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `baseline_001` | `tf_efficientnetv2_s` | frozen backbone | 2 | 0.7432 | 0.7776 |
| `final_004` | `tf_efficientnet_b0` | full fine-tune | 12 | **0.9422** | **0.9501** |

### 3.3 Per-class results (final_004)

| Class | Precision | Recall | F1 | Support |
| :--- | :--- | :--- | :--- | :--- |
| Pepper__bell___Bacterial_spot | 0.9667 | 0.9732 | 0.9699 | 149 |
| Pepper__bell___healthy | 0.9776 | 0.9864 | 0.9820 | 221 |
| Potato___Early_blight | 0.9801 | 0.9867 | 0.9834 | 150 |
| Potato___Late_blight | 0.8974 | 0.9333 | 0.9150 | 150 |
| Potato___healthy | 0.8077 | 0.9545 | 0.8750 | 22 |
| Tomato_Bacterial_spot | 0.9303 | 0.9624 | 0.9461 | 319 |
| Tomato_Early_blight | 0.9333 | 0.8400 | 0.8842 | 150 |
| Tomato_Late_blight | 0.9368 | 0.9368 | 0.9368 | 285 |
| Tomato_Leaf_Mold | 0.9085 | 0.9789 | 0.9424 | 142 |
| Tomato_Septoria_leaf_spot | 0.9544 | 0.9472 | 0.9508 | 265 |
| Tomato_Spider_mites_Two_spotted_spider_mite | 0.9121 | 0.9920 | 0.9504 | 251 |
| Tomato__Target_Spot | 0.9760 | 0.7762 | 0.8647 | 210 |
| Tomato__Tomato_YellowLeaf__Curl_Virus | 0.9957 | 0.9730 | 0.9842 | 481 |
| Tomato__Tomato_mosaic_virus | 0.9483 | 1.0000 | 0.9735 | 55 |
| Tomato_healthy | 0.9555 | 0.9958 | 0.9752 | 237 |

Full confusion matrix: `chloromap/reports/figures/confusion_matrix.png`.

### 3.4 Inference / latency benchmark

Measured on an **NVIDIA T1200 Laptop GPU (4 GB)**, FP32, 224×224 input,
batch size 1, 50 iterations after 5 warmup passes. Reproduce with:

```bash
cd chloromap
python scripts/benchmark.py --checkpoint weights/best_model.pth --iterations 50 --json
```

| Metric | Value |
| :--- | :--- |
| Device | NVIDIA T1200 Laptop GPU (CUDA) |
| Model load time | 0.896 s |
| Avg latency | 21.11 ms |
| Median latency | 21.08 ms |
| P95 latency | 21.43 ms |
| Min / Max latency | 20.92 / 21.47 ms |
| GPU memory (allocated) | 25.5 MB |
| GPU memory (reserved) | 60.8 MB |

> AMP/FP16 is deliberately **disabled** in the final recipe: on this GPU FP16 is
> ~7× slower than FP32 (non-tensor-core fallback paths), measured in place.

### 3.5 Dataset health (audit)

Source: `chloromap/reports/final/dataset_audit.json`.

| Metric | Value |
| :--- | :--- |
| Total images | 20,638 |
| Classes | 15 |
| Min / max class size | 152 / 3,208 |
| Class imbalance ratio | 21.1× |
| Corrupt / unreadable / zero-byte | 0 |
| Duplicate hashes | 14 |

The 21× imbalance (driven by `Potato___healthy`) is handled with
class-balanced sampling during training.

---

## 4. Workflow

Chloromap runs as a deterministic pipeline. Each stage is a standalone script
under `chloromap/scripts/` and writes machine-readable artifacts.

```text
audit → split → train → evaluate → predict → serve → test
```

```text
data/raw/plantvillage
        │
        ▼
 [1] audit_dataset.py ──▶ reports/final/dataset_audit.json
        │
        ▼
 [2] prepare_dataset.py ──▶ data/processed/ (deterministic stratified split)
        │
        ▼
 [3] train.py --config configs/final.yaml ──▶ weights/best_model.pth
        │                                   └▶ reports/experiments/final_004.json
        ▼
 [4] evaluate.py ──▶ reports/final/metrics.json
        │           ├▶ reports/final/model_report.md
        │           └▶ reports/figures/confusion_matrix.png
        ▼
 [5] predict.py / serve.py ──▶ FastAPI inference service (:8000)
        │
        ▼
 [6] pytest ──▶ 50+ unit tests (synthetic fixtures, no dataset required)
```

### Stage 1 — Audit (`scripts/audit_dataset.py`)

Validates every image and reports counts, imbalance, corrupt/zero-byte/unreadable
files, and duplicate hashes. **Never modifies data.**

### Stage 2 — Split (`scripts/prepare_dataset.py`)

Produces a deterministic, seeded, stratified train/val split. An official
organizer split (if supplied) is preserved.

### Stage 3 — Train (`scripts/train.py`)

```bash
python scripts/train.py --config configs/baseline.yaml   # frozen-backbone baseline
python scripts/train.py --config configs/final.yaml      # fine-tuned final
```

- AdamW + warmup-cosine scheduler, mixup, random erasing, class-balanced sampling.
- Macro-F1 checkpointing → `weights/best_model.pth`.
- Experiment record → `reports/experiments/*.json`.
- CLI overrides: `--epochs`, `--batch-size`, `--seed`, `--device`, etc.

### Stage 4 — Evaluate (`scripts/evaluate.py`)

```bash
python scripts/evaluate.py --checkpoint weights/best_model.pth
```

Emits `metrics.json`, `model_report.md`, and the confusion-matrix figure.

### Stage 5 — Predict (`scripts/predict.py`)

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

### Stage 6 — Test (`uv run pytest`)

50+ tests using synthetic fixtures; no dataset or GPU required.

---

## 5. Endpoints

The service is a FastAPI app (`chloromap/src/chloromap/api.py`). The model is
loaded once at startup; blocking decode + inference run in a threadpool so the
event loop stays responsive under concurrent uploads.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Diagnostics: `status`, `model_loaded`, `device` |
| `GET` | `/metadata` | Model/checkpoint info: `model_name`, `num_classes`, `class_names`, `image_size`, `device`, validation metrics, `best_epoch` |
| `POST` | `/predict` | Multipart image upload (`field name: image`) → classification |
| `POST` | `/api/v1/predict` | Versioned alias of `/predict`, used by the MERN frontend |

Interactive API docs are served at `/docs` (Swagger UI) and `/redoc`.

### Request / response

```bash
curl -X POST http://localhost:8000/predict -F "image=@leaf.jpg"
```

```json
{
  "class_id": 17,
  "class_name": "Tomato___Early_blight",
  "confidence": 0.91
}
```

### Launch

```bash
python scripts/serve.py --port 8000
python scripts/serve.py --checkpoint weights/best_model.pth --port 8080
# or directly:
uvicorn chloromap.api:app --host 0.0.0.0 --port 8000
```

### Operational safeguards

- Uploads are size-limited (**10 MB**) and MIME-validated
  (JPEG/PNG/WEBP/BMP/TIFF).
- Images above **40 MP** (decompression bombs) are rejected with **413**.
- EXIF orientation is applied before inference.
- Structured error responses (never stack traces); no images are stored or logged.
- CORS is enabled and configurable.
- The API reads `CHLOROMAP_URL` in the Express server (default
  `http://127.0.0.1:8000`); the frontend calls the versioned alias.

### CORS & environment

| Variable | Default | Description |
| :--- | :--- | :--- |
| `CHLOROMAP_CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `AGRISMART_CORS_ORIGINS` | — | Fallback for the above |
| `CHLOROMAP_URL` | `http://127.0.0.1:8000` | Base URL the Express API calls |

```bash
CHLOROMAP_CORS_ORIGINS=https://app.agrismart.com python scripts/serve.py
```

---

## 6. Setup & Requirements

- Linux, NVIDIA GPU with ~4 GB VRAM (tested: NVIDIA T1200 Laptop GPU)
- NVIDIA driver with CUDA 12.x/13.x support
- Python 3.13 and [`uv`](https://docs.astral.sh/uv/)

```bash
cd chloromap
uv sync                      # creates .venv from pyproject.toml / uv.lock
source .venv/bin/activate
uv run pytest                # 50+ tests
```

Full setup, training, and troubleshooting details are in
[`chloromap/README.md`](../chloromap/README.md).

---

## 7. Limitations

- **Lab → field domain shift:** trained on clean PlantVillage imagery; the
  PlantDoc-style field set is the competition protocol and is never trained on.
- **Confidence ≠ severity:** softmax confidence is calibrated for
  classification, not for treatment/severity decisions.
- **Confusable classes:** visually similar diseases may be confused (notably
  `Tomato__Target_Spot` and `Tomato_Early_blight`); see the confusion matrix.
- **Class imbalance:** rare classes (e.g. `Potato___healthy`, 152 images) are
  harder; balanced sampling mitigates but does not eliminate this.
- **Not bit-for-bit reproducible across machines** due to GPU nondeterminism;
  inference from a fixed checkpoint is reproducible.

---

## 8. Related Documentation

- [`chloromap/README.md`](../chloromap/README.md) — subsystem setup and scripts
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — how the diagnosis pipeline calls Chloromap
- [`report/model_report.md`](../report/model_report.md) — one-page model report
- [`model/README.md`](../model/README.md) — SIH-mandated model pointer
