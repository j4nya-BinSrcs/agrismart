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

## Getting Started

### Prerequisites

- **Node.js ≥ 18** and npm ≥ 9
- **MongoDB** — local `mongod`, MongoDB Atlas, or Docker (the launcher can
  provision a local instance automatically)
- (Optional) **Python 3.13 + GPU** for the Chloromap ML service; the app still
  runs with Gemini-only diagnosis if ML is unavailable

### Install

```bash
npm install
```

### Configure environment

```bash
# Server config (repo root)
cp .env.example .env
#  → set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY

# Client config
cp client/.env.example client/.env
#  → set VITE_API_URL (default http://localhost:5000/api/v1)
```

> **Note:** `client/.env` and `.env` are git-ignored (only the `.env.example`
> templates are tracked). The API auto-loads `.env` from the repo root.

### Run the full stack

```bash
npm run dev          # API (:5000) + client (:3000) concurrently
# or use the launcher for DB + API + client + ML together:
./launch.sh up
```

Then open **http://localhost:3000**.

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
> **TBD from team** — placeholders for SIH submission:
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