# AgriSmart AI

**Intelligent agriculture for a sustainable future.**

AgriSmart AI is an AI-powered agricultural decision-support platform that helps
farmers diagnose crop diseases, understand the weather, schedule irrigation,
track sustainability, and get grounded agronomic advice — all in one connected
experience with trilingual support (English, Hindi, Gujarati).

The platform is a full MERN monorepo (React + Express + MongoDB) with a
dedicated computer-vision ML subsystem (Chloromap) for crop disease
classification.

> **Status:** Production-ready build. Client (React 19 + Vite), API (Express 4 +
> MongoDB), and an ML inference service (FastAPI + PyTorch). Handles missing
> upstream services gracefully with deterministic, data-grounded fallbacks.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Testing](#testing)
- [Chloromap ML](#chloromap-ml)
- [Launcher](#launcher)
- [Related Documentation](#related-documentation)

---

## Features

### Crop Disease Diagnosis
- Leaf photography via camera/gallery or drag-and-drop upload
- Picks the best available inference engine: **Chloromap ML** (computer vision)
  first, then the **Gemini** multimodal fallback
- Confidence, severity rating (`low`/`moderate`/`high`/`severe`/healthy `none`),
  and per-disease precations & treatment guidance
- Diagnosis history scoped per user & farm, plus a printable/sharable **PDF report**

### Weather Intelligence
- Hyper-local current conditions, hourly & daily forecast from Open-Meteo
- "What does this weather mean for my farm?" crop-specific risk advisories

### Smart Irrigation
- Soil-moisture–aware scheduling fused with rain probability
- Zone-by-zone recommendations (irrigate / delay / watch) plus water-savings insight

### Sustainability
- Sustainability score, water efficiency, resource usage, carbon impact, and
  actionable improvement suggestions

### Farmer Assistant
- Grounded conversational advisor backed by **Gemini**, strict grounding
  validation, and a deterministic rule engine when the model is unavailable
- Answers farm-specific questions from your registered fields/farms
- Trilingual: **English, Hindi, Gujarati** with language enforcement

### Farm Management
- Farms, fields/plots, and zones with location, crop, stage, soil type & moisture

### Provider Resiliency
- Every screen degrades gracefully: demo-data fallbacks, deterministic rule
  engines, and structured errors instead of blank pages

---

## Architecture Overview

```text
        ┌─────────────────┐        ┌──────────────────────────────────────┐
        │  React/Vite SPA  │ ──────▶│  Express API  (:5000)  /api/v1        │
        │  (client :3000)  │  HTTP  │  auth · diagnosis · weather ·          │
        └─────────────────┘        │  irrigation · sustainability ·         │
                                    │  assistant · farms/fields/zones        │
                                    └───┬───────────────┬───────────┬────────┘
                                        │               │           │
                                   ┌────▼────┐    ┌─────▼─────┐  ┌──▼────────┐
                                   │ MongoDB │    │ Chloromap │  │ Gemini AI │
                                   │ (:27017)│    │ FastAPI   │  │ (external)│
                                   └─────────┘    │ (:8000)   │  └───────────┘
                                                   │ PyTorch   │
                                                   └───────────┘
```

- **`client/`** — React 19 + Vite + Tailwind 4 SPA. Custom hash-path router,
  service layer, Auth/Farm/Theme/Toast contexts, demo-data fallbacks.
- **`server/`** — Express 4 + Mongoose 9 API. JWT auth, layered services,
  Open-Meteo integrations, Gemini grounding, PDF report generation.
- **`chloromap/`** — self-contained PyTorch (EfficientNet) ML subsystem with a
  FastAPI inference service used by the diagnosis pipeline.
- **`launch.sh` / `launch.ps1`** — dev/production supervisor: provisions
  MongoDB (local or Docker), boots the API, client, and ML service, and tails logs.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full detail (data
flows, interceptors, provider-failure handling).

---

## Repository Layout

```text
AgriSmart/
├── client/                       # React 19 + Vite + Tailwind SPA (npm workspace)
│   ├── .env.example              #   VITE_API_URL
│   ├── vercel.json               #   SPA rewrites for static hosting
│   └── src/
│       ├── components/           # screens, layout, common UI, auth
│       ├── context/              # Auth, Farm, Theme, Toast providers
│       ├── services/             # HTTP service layer with demo fallbacks
│       ├── data/                 # India location data + demo/mock data
│       ├── utils/                # formatters, storage
│       └── types/
├── server/                       # Express 4 + Mongoose 9 API (npm workspace)
│   └── src/
│       ├── server.ts             # entry point (www/index)
│       ├── app.ts                # Express app: middleware, routes, errors
│       ├── config/               # env parsing + Mongo connection
│       ├── controllers/          # request handlers
│       ├── models/               # User, Farm, Field, Zone, Diagnosis, CropKnowledge
│       ├── routes/               # /api/v1 routers (incl. nested fields/zones)
│       ├── middleware/           # JWT auth, error/404 handlers, validators
│       ├── services/             # auth, diagnosis, weather, irrigation,
│       │                         # sustainability, assistant(Gemini), PDF report
│       └── utils/                # ApiError, ApiResponse, logger
├── chloromap/                    # PyTorch ML subsystem (FastAPI inference service)
│   ├── configs/                  # baseline.yaml, final.yaml
│   ├── scripts/                  # audit / prepare / train / evaluate / predict / serve
│   ├── src/chloromap/            # data, models, training, evaluation, inference
│   ├── tests/                    # pytest suites
│   ├── weights/                  # trained checkpoints
│   └── requirements.txt
├── scripts/launch/               # launcher env & bash/pwsh libraries
├── launch.sh / launch.ps1        # dev/production supervisor
├── .env.example                  # server configuration template
└── package.json                  # npm workspaces (client, server) + dev scripts
```

---

## Getting Started (Judge Quick-Start)

> **Target:** Reproduce a prediction in **under 10 minutes** on a fresh clone.
> **Recommended:** Use the launcher script — it handles MongoDB, npm, uv, and
> all services automatically.

### Prerequisites

- **Linux / macOS / WSL2** (Windows users: run `launch.ps1` in PowerShell)
- **Node.js ≥ 18** (includes npm)
- **Python 3.13** + **uv** (for Chloromap ML) — install: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **NVIDIA GPU + CUDA 12/13** (for ML; CPU fallback works but slower)
- **MongoDB** — launcher auto-provisions local `mongod` or Docker if available

### One-command launch (recommended)

```bash
git clone <this-repo>
cd AgriSmart

# Optional: add Gemini API key for LLM features
cp .env.example .env
# edit .env → set GEMINI_API_KEY (optional; app works with fallback rules)

# Start everything: MongoDB + API + Client + Chloromap ML
./launch.sh up
```

The launcher will:
1. `npm install` (client + server workspaces)
2. `uv sync` in `chloromap/` (creates `.venv` with pinned deps)
3. Start MongoDB (local or Docker)
4. Start API server on `:5000`
5. Start Vite client on `:3000`
6. Start Chloromap FastAPI on `:8000` (loads `weights/best_model.pth`)

Wait for "Ready." banner, then open **http://localhost:3000**.

### Verify a prediction

1. Open http://localhost:3000 → Sign up / Login
2. Go to **Diagnosis** → Upload a leaf image (or use camera)
3. Click **Analyze** → see class + confidence + treatment guidance

**API-only test** (no UI):
```bash
# Use any leaf image (JPEG/PNG/WEBP, max 10 MB)
curl -X POST http://localhost:8000/predict -F "image=@/path/to/your/leaf.jpg"
# Returns: {"class_id": 14, "class_name": "Tomato_healthy", "confidence": 0.91}
```

### Manual setup (if launcher fails)

```bash
# 1. Node deps
npm install

# 2. Chloromap ML deps
cd chloromap && uv sync && cd ..

# 3. MongoDB (pick one)
#    A) Local: mongod --dbpath .run/mongodb-data --port 27017
#    B) Docker: docker run -d -p 27017:27017 -v .run/mongodb-data:/data/db mongo

# 4. Env
cp .env.example .env
cp client/.env.example client/.env
# edit .env → MONGODB_URI, JWT_SECRET, GEMINI_API_KEY (optional)

# 5. Run
npm run dev                    # API + Client (in one terminal)
# In another terminal:
cd chloromap && uv run python scripts/serve.py  # ML on :8000
```

### Stop / Restart

```bash
./launch.sh down       # stop all
./launch.sh restart    # down + up
./launch.sh status     # health snapshot
./launch.sh logs ml    # tail ML logs
```

---

## Configuration

Environment variables are read from `.env` at the repo root (server) and
`client/.env` (client).

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | Runtime environment |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/agrismart` | MongoDB connection string |
| `JWT_SECRET` | dev fallback | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | `7d` | Access-token lifetime |
| `GEMINI_API_KEY` | — | Google Gemini API key (**required** for live LLM) |
| `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model identifier |
| `CHLOROMAP_URL` | `http://127.0.0.1:8000` | Chloromap ML inference base URL |
| `APP_URL` | `http://localhost:5000` | Public app URL |

Client:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | — | Base URL for the API (e.g. `/api/v1`) |

---

## Available Commands

Run from the repo root (`npm` workspaces):

| Command | Description |
| :--- | :--- |
| `npm install` | Install client + server dependencies |
| `npm run dev` | Run API + client simultaneously (concurrently) |
| `npm run dev:client` | Vite dev server on `http://localhost:3000` |
| `npm run dev:server` | Express API via `tsx watch` on `http://localhost:5000` |
| `npm run build` | Type-check + build both workspaces |
| `npm run lint` | TypeScript type-check for client & server |
| `npm test` | Server test harness (`server/tests/*.test.ts`) |
| `npm run preview` | Preview the built client |
| `./launch.sh up` | Supervisor: DB + API + client + ML (see below) |

Individual workspaces can also be addressed directly, e.g.
`npm run build --workspace server` or `npm run build --workspace client`.

---

## Testing

- **Server:** hand-rolled Node test harness. `npm test` runs
  `server/tests/*.test.ts` (assistant, auth, farm, sustainability) via `tsx`
  from the repo root.
- **Chloromap:** `cd chloromap && uv run pytest` (or `python -m pytest`) — 50+
  unit tests with synthetic fixtures, no dataset required.
- **Client:** type-checked via `npm run lint` (`tsc --noEmit`).

---

## Chloromap ML

**Chloromap** is the self-contained PyTorch + FastAPI crop-disease classifier
subsystem. Given a leaf image it returns the disease (or healthy) class and a
confidence; any agronomic guidance is handled by the API layer.

- **Backbone:** EfficientNet (`timm`) — `tf_efficientnet_b0`, 224×224, ImageNet normalization
- **Classes:** 15-class production checkpoint (Pepper/Potato/Tomato); 25-class canonical spec in `configs/class_spec.yaml`
- **Primary metric:** Macro-F1
- **Endpoints:** `GET /health`, `GET /metadata`, `POST /predict`, `POST /api/v1/predict`

### Quick benchmarks

| Metric | Value | Context |
| :--- | :--- | :--- |
| Val Macro-F1 | **0.9422** | 15-class held-out validation split |
| Val Accuracy | 0.9501 | same split |
| Avg inference latency | **21.1 ms** | NVIDIA T1200, FP32, batch 1 |
| Model load time | 0.90 s | once at startup |
| GPU memory reserved | 60.8 MB | inference |

Reproduce: `cd chloromap && python scripts/benchmark.py --checkpoint weights/best_model.pth --iterations 50`.

See [docs/CHLOROMAP.md](docs/CHLOROMAP.md) for the full introduction, per-class
results, supported classes, training workflow, and endpoint reference.

---

## Launcher

`./launch.sh` (and `launch.ps1` for PowerShell) supervises the whole stack —
MongoDB, API, client, and Chloromap — writing PIDs/logs under `.run/`.

```bash
./launch.sh                  # start everything (foreground supervisor)
./launch.sh up --no-ml       # skip the ML service
./launch.sh up --no-db       # assume MongoDB is already running
./launch.sh up --detach      # start and return (supervisor detached)
./launch.sh status           # per-service health snapshot
./launch.sh logs server      # tail logs (server|client|ml|mongodb|all)
./launch.sh down             # stop all managed services
./launch.sh restart          # down + up
```

Defaults (override-safe): ports `3000`/`5000`/`8000`/`27017`, runtime
artifacts under `.run/`, Chloromap at `./chloromap`. Config precedence:
environment variables > `scripts/launch/local.env` > `scripts/launch/defaults.env`.

---

## Problem-Statement Compliance (SIH 2026)

### Dataset transparency & licences
- **PlantVillage** (Mohanty et al., 2016) — 54,305 lab-condition images, **CC BY-SA 3.0**.
  - Source: GitHub `spMohanty/PlantVillage-Dataset` (mirror of original dataset).
  - Hugging Face mirror: `mohanty/PlantVillage`, `geraldmc/plantvillage-full`.
  - Only the **shared class list** classes from the problem statement are used (see `chloromap/configs/class_spec.yaml`).
- **PlantDoc** (Kayal et al., 2020) — 2,572 field-condition images, **CC BY 4.0**.
  - Source: GitHub `pratikkayal/PlantDoc-Dataset`.
  - Hugging Face mirror: `geraldmc/plantdoc-full`.
  - Used for out-of-distribution adaptation/evaluation only — never for training the primary model.

Both datasets are downloaded at build time by `chloromap/scripts/build_dataset.py` and are **never committed** (see `.gitignore`).

### Originality & AI assistance
This project was **bootstrapped from Google AI Studio** with human architectural direction and subsequent manual engineering:
- **Human-value-added steps** (non-exhaustive):
  - Problem-statement interpretation, class-list design, compliance checklist (Section 7).
  - Repository structure (MERN monorepo + self-contained ML subsystem) per submission mandates.
  - Server: layered services (auth, diagnosis, weather, irrigation, sustainability, assistant, PDF report), JWT auth, anti-IDOR, provider-resilient fallbacks, trilingual support.
  - Client: custom hash-router, React 19 + Vite + Tailwind 4 SPA with service layer, demo-data fallbacks, trilingual i18n.
  - ML: EfficientNetV2-S factory, deterministic training/evaluation scripts, class-agnostic configs, FastAPI inference wrapper, ONNX export stub.
  - Sustainability: honest FAO-56 composite with graceful client fallback (no fabricated CO₂/chemical numbers).
  - Tests: 69 server tests (auth, farm, diagnosis, sustainability, assistant), 50+ Chloromap unit tests.

> AI Studio generated scaffolding; every file was reviewed, refactored, and extended by hand to meet the SIH rubric.

### Demo video & deployed URL

> **Demo video:** [`agrismart_demo.mp4`](agrismart_demo.mp4) (local file, ~97 MB)
>
> For SIH submission, upload to YouTube/Drive and replace with public link:
> - Demo video: `[insert YouTube/Drive link]`
> - Deployed app: `[insert URL]`

---

## Submission Artifacts (Section 7.1 layout)

| Directory | Purpose |
| :--- | :--- |
| [`/model/`](model/) | Trained checkpoint + training tooling (in `chloromap/`) |
| [`/report/`](report/) | One-page model report (`model_report.md`) |

### Repository Layout (updated)

```text
AgriSmart/
├── model/                       # ← SIH mandated: trained model pointer
│   └── README.md
├── report/                      # ← SIH mandated: one-page model report
│   └── model_report.md
├── client/                      # React 19 + Vite + Tailwind SPA
...
```

See [`model/README.md`](model/README.md) and [`report/model_report.md`](report/model_report.md) for details.

---

## Related Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, data flows, provider-failure handling
- [`docs/CHLOROMAP.md`](docs/CHLOROMAP.md) — Chloromap ML subsystem: classes, benchmarks, workflow, endpoints
- [`chloromap/README.md`](chloromap/README.md) — Chloromap setup, training, and evaluation scripts
- [`report/model_report.md`](report/model_report.md) — one-page model evaluation report