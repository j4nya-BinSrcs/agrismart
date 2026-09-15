# AgriSmart AI — Architecture Overview

> This document describes the high-level system design of the AgriSmart AI
> platform: components, data flows, external providers, and how the system
> degrades gracefully when upstream services fail.

---

## 1. System at a Glance

AgriSmart AI is a trilingual (English / Hindi / Gujarati) agricultural
decision-support platform. A single-page React application talks to an
Express REST API backed by MongoDB. The API orchestrates several domain
engines — weather (Open-Meteo), irrigation (FAO-56 agronomy engine), crop
diagnosis (Chloromap ML + Gemini fallback), sustainability accounting, and a
grounded farmer assistant (Gemini) — each with deterministic fallbacks so the
app remains functional when external providers are unreachable.

```text
┌──────────────────┐          ┌────────────────────────────────────────────┐
│   React/Vite SPA │──HTTP──▶│        Express REST API  (:5000)            │
│   client (:3000) │  /api/v1 │  ┌──────────────┐  ┌─────────────────────┐  │
└──────────────────┘          │  │ Controllers  │  │ Services (engines)  │  │
                              │  └──────┬───────┘  └──────────┬──────────┘  │
                              │         │                      │            │
                              │   ┌─────▼──────────────────────▼─────┐      │
                              │   │  Mongoose (MongoDB, :27017)       │      │
                              │   └───────────────────────────────────┘      │
                              │         │                                    │
                              │   ┌─────▼──────────────┐   ┌─────────────┐   │
                              │   │ Chloromap (ML)     │   │ Gemini AI   │   │
                              │   │ FastAPI  (:8000)   │   │ (external)  │   │
                              │   └────────────────────┘   └─────────────┘   │
                              └────────────────────────────────────────────┘
                                                          externals:
                                            Open-Meteo (forecast), Google Gemini
```

Ports: **client 3000 · API 5000 · Chloromap ML 8000 · MongoDB 27017.**

---

## 2. Components

### 2.1 Client — `client/` (React 19 + Vite + Tailwind 4)

- **Routing:** a small in-house router (`App.tsx` `pathToScreen` / hash-aware
  `normalizePath`) supports clean and hash-based URLs, symmetric to
  `ScreenType`. No external router dependency.
- **State:** React Context providers — `AuthContext` (JWT session, demo mode,
  sign-up → pending farm), `FarmContext` (active farm + coordinates),
  `ThemeContext` (dark/light), `ToastContext`.
- **Service layer:** `client/src/services/` abstracts all API calls and ships a
  **demo-data fallback** per domain (diagnosis, weather, irrigation,
  sustainability, assistant) so the UI is explorable without a backend.
- **Storage:** `utils/storage.ts` persists session, pending farm, and local
  diagnosis-history caches keyed by user.
- **Screens:** Landing, Login, Signup, Dashboard, Farm Management, Diagnose,
  Diagnosis Result, Weather, Irrigation, Sustainability, Assistant, 404.

### 2.2 API — `server/` (Express 4 + Mongoose 9)

- `server.ts` boots HTTP + Mongo with graceful shutdown; `app.ts` wires
  middleware (CORS, JSON 10 MB, morgan), mounts `/api/v1` routes, and central
  error/404 handlers.
- Controllers are thin; all business logic lives in `services/`.
- JWT auth (`jsonwebtoken`), passwords hashed with `bcryptjs`.
- Optional auth via `authenticateOptional` allows protected routes to degrade
  to public/demo data when no token is supplied.

### 2.3 ML Subsystem — `chloromap/` (PyTorch + FastAPI)

- Separate Python project. Trains EfficientNet classifiers (PlantVillage-derived
  crop/disease classes) and serves them over FastAPI.
- **Endpoints:** `GET /health`, `GET /metadata`, `POST /predict`,
  `POST /api/v1/predict` (versioned alias used by the API).
- Returns `{ class_id, class_name, confidence }`; model loaded once at startup.
- See [chloromap/README.md](../chloromap/README.md).

---

## 3. Request Flow: Diagnosis (the critical path)

```text
Client upload → POST /api/v1/diagnosis/analyze
   │   { imageUrl (data URL), crop, growthStage, fieldLocation }
   ▼
diagnosisController.analyzeCrop
   ▼
diagnosisService:
   1. Decode/validate image (size, format)
   2. classifyWithChloromap(imageUrl)   ──▶ Chloromap /api/v1/predict
        │  (returns null if ML is unreachable / rejects)
        ▼
   3. If ML class present:
        normalize label → CropKnowledge entry → real severity + treatments
      Else:
        buildAdvisoryFromCropKnowledge(...)   (expert-advisory fallback mode;
        explicit "not an automated diagnosis" framing — no false confidence)
   4. saveDiagnosis → Mongo (scoped to farm), history for /diagnosis/history
   ▼
Response { diseaseName, severity, confidence, symptoms, treatments,
          precautions, recommendedActions, relatedInsights }
```

- **PDF report:** `POST /api/v1/diagnosis/report` generates a compact,
  single-page PDF (pdfkit) for a saved diagnosis.
- **Resilience:** Chloromap failure downgrades to a Gemini multimodal fallback;
  if that also fails (e.g. 429 quota), the advisory engine returns
  CropKnowledge-driven guidance instead of an error.

---

## 4. Domain Engines (server services)

### 4.1 Weather — `weatherService.ts`
- Pulls **single aggregated `GET /weather` forecast** (current + hourly + daily)
  from Open-Meteo by lat/lng.
- Caches responses (10-min TTL), retries up to 2x with backoff, zeroes missing
  metrics, and augments data with crop-specific risk advisories.

### 4.2 Irrigation — `irrigationService.ts`
- **FAO-56 agronomy engine** (crop coefficients `Kc`, interpolated growth
  stages, soil characteristics, irrigation-method efficiencies).
- Fuses soil-moisture telemetry with forecast rain probability to emit a
  zone-by-zone verdict (`IRRIGATE` / `DELAY_IRRIGATION` / watch) and water-savings
  estimates. Supports demo defaults when no real zones exist.

### 4.3 Sustainability — `sustainabilityService.ts`
- Computes a sustainability score from weighted irrigation efficiency,
  resource usage, crop health, and farm/zone areas.
- Evaluates water saved vs. a conventional baseline and returns improvement
  insights, scoped by `farmId`/`fieldId`/date range.

### 4.4 Assistant — `assistantController.ts` + `geminiService.ts`
- Builds a **verified-telemetry context** (farms, fields, latest diagnosis,
  weather, irrigation verdict) and requests a grounded answer from Gemini
  (`gemini-flash-latest`, temperature 0.1).
- **Strict grounding validation:** any reply not supported by the provided
  context is intercepted.
- **Intent routing:** irrigation / weather / diagnosis / farm-data / general so
  deterministic answers actually address the question.
- **Deterministic fallback** answers from the same context when Gemini is
  unreachable or 429-quota'd (with one automatic retry), and enforces the
  requested script (Devanagari/Gujarati) on the final reply.
- Trilingual via prompt/`endInstruction`; language selection on the client
  (`languageExplicit`) and auto-detection on the server.

---

## 5. REST API Surface (`/api/v1`)

| Area | Methods / Paths |
| :--- | :--- |
| Health | `GET /health` |
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` (JWT) |
| Diagnosis | `POST /diagnosis/analyze` · `POST /diagnosis/report` · `GET /diagnosis/history` · `GET /diagnosis/:id` · `POST /diagnosis` (save) — all JWT-protected |
| Weather | `GET /weather` (current + hourly + daily forecast) · `POST /irrigation/plan` consumes it internally |
| Irrigation | `POST /irrigation/plan` (FAO-56 plan, optional zones) |
| Sustainability | `GET /sustainability/summary` (JWT, farm/field/date query params) |
| Assistant | `POST /assistant` (grounded chat; optionally-authenticated for full-farm context) |
| Farms / Fields / Zones | `POST/GET/PATCH/DELETE /farms`, `GET /farms/:farmId/overview`, nested `/farms/:farmId/fields/:fieldId/zones` — all auth-protected |

All farm-related endpoints require a valid JWT; many support `authenticateOptional`
so demo/offline clients still render data.

---

## 6. External Providers & Failure Semantics

| Provider | Used for | Degradation |
| :--- | :--- | :--- |
| MongoDB | Persistence (users, farms, fields, zones, diagnoses, crop knowledge) | Client reads local caches; demo data renders |
| Open-Meteo | Weather + irrigation rain signal | Deterministic fallbacks; zero-filled metrics |
| Google Gemini | Diagnosis fallback + assistant grounding | Deterministic grounded engine; advisory mode |
| Chloromap ML | Leaf-image classification | Gemini multimodal → expert advisory fallback |
| No API key / 429 quota | — | Each downstream path logs **why** (`logger.warn` with upstream message) and falls back safely |

No secrets are logged; env-driven config lives in `server/src/config/env.ts`.

---

## 7. Persistence Model

- **User** — credentials (bcrypt hash), profile/role, farm membership.
- **Farm** — name, location, state/district, `totalAreaAcres`, members.
- **Field** — crop (pepper_bell/potato/tomato), variety, growth stage,
  soil type, irrigation method, `soilMoisture`.
- **Zone** — sub-field irrigation/moisture zones (nested under fields).
- **Diagnosis** — image, ML/advisory result, severity enum
  (`low`/`moderate`/`high`/`severe`/`none` for healthy), treatments, PDF export flag.
- **CropKnowledge** — seeded reference catalog of crops, diseases, symptoms,
  precautions, treatment protocols, and related insights.

See `server/src/models/*.ts` for schemas and view projections.

---

## 8. Observability & Launch

- **Logging:** `server/src/utils/logger.ts` appends to `.run/logs` via the
  launcher; morgan for HTTP.
- **Launcher:** `launch.sh`/`launch.ps1` provision MongoDB (reuse / local /
  Docker), start API + client + Chloromap, and provide `status`, `logs`,
  `down`, `restart`. Config precedence: env vars → `scripts/launch/local.env`
  → `scripts/launch/defaults.env`.
- **Testing:** server harness `server/tests/*.test.ts` (`npm test`);
  Chloromap `pytest`; client type-checked via `tsc --noEmit`.

---

## 9. Security Notes

- JWT access tokens (`7d` expiry), bcrypt password hashes.
- CORS allow-list enforced server-side (local dev origins + `CORS_ORIGIN`).
- 10 MB request body limit; image validation before ML send (size/format).
- Assistant output is both prompt-grounded and post-validated; harmful or
  non-factual filler is intercepted before reaching the farmer.