# 🌱 AgriSmart AI

### Intelligent Agriculture for a Sustainable Future

AgriSmart AI is an AI-powered agricultural decision-support platform designed to help farmers make smarter, faster, and more sustainable decisions.

The platform brings crop disease diagnosis, weather intelligence, smart irrigation, sustainability insights, and an agricultural assistant into one connected experience.

> 🚧 **Current Status:** MERN full-stack build — Express + MongoDB API (auth, diagnosis, weather, irrigation, assistant, sustainability), a Gemini-grounded farmer assistant, and a React/Vite client with realistic demo-data fallbacks when the backend or external APIs are offline.

---

## ✨ Features

### 📊 Smart Dashboard
- Farm health overview
- Crop health summary
- Soil moisture monitoring
- Weather conditions
- Disease/risk indicators
- Today's recommended actions
- Recent crop diagnoses
- Sustainability overview

### 🌿 Crop Disease Diagnosis
- Upload crop/leaf images
- Drag & drop image upload
- Camera/gallery interface
- Image preview
- Crop and growth-stage selection
- AI analysis interface
- Disease/healthy status
- Confidence percentage
- Severity information
- Recommended precautions and actions

### 🌦️ Weather Intelligence
- Current temperature
- Humidity
- Rain probability
- Forecast
- Agricultural weather risks
- Actionable recommendations

Instead of simply showing weather data, the interface focuses on:

> **"What does this weather mean for my farm?"**

### 💧 Smart Irrigation
- Soil moisture
- Crop information
- Growth stage
- Rain probability
- Irrigation status
- AI recommendations
- Water usage/saving insights

### 🌍 Sustainability
- Sustainability score
- Water efficiency
- Resource usage
- Crop health
- Estimated water saved
- Carbon impact
- Improvement suggestions

### 🤖 Farmer Assistant
- Agricultural-focused conversational interface
- Crop-related questions
- Farming recommendations
- Contextual agricultural guidance

---

## 🚀 Getting Started

```bash
# 1. Install all workspace dependencies (client + server)
npm install

# 2. Configure environment
cp .env.example .env                  # server vars (GEMINI_API_KEY, MONGODB_URI, JWT_SECRET...)
cp client/.env.example client/.env    # frontend vars (VITE_API_URL)

# 3. Run the full stack (client on :3000, API on :5000)
npm run dev
```

Useful per-app commands:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Run client + server together (concurrently) |
| `npm run dev:client` | Vite dev server on `http://localhost:3000` |
| `npm run dev:server` | Express API (tsx watch) on `http://localhost:5000` |
| `npm run build` | Production build for client + server type-check |
| `npm run lint` | `tsc --noEmit` for both workspaces |
| `npm test` | Server test harness (`server/tests/*.test.js`) |

## 🏗️ Project Structure

```text
AgriSmart/
├── .env / .env.example        # server configuration
├── client/                    # React + Vite + Tailwind frontend (npm workspace)
│   ├── .env.example           # VITE_API_URL
│   ├── vercel.json            # SPA rewrites for static hosting
│   └── src/                   # screens, components, services, contexts, types
└── server/                    # Express + Mongoose backend (npm workspace)
    ├── server.js              # entry point
    ├── src/
    │   ├── config/            # env + DB connection
    │   ├── controllers/       # request handlers
    │   ├── models/            # User, Farm, Field, Zone, Diagnosis
    │   ├── routes/            # /api/v1 routers
    │   ├── services/          # auth, diagnosis, gemini, weather, irrigation, ...
    │   ├── middleware/        # JWT auth, error/not-found handlers, validators
    │   └── utils/             # ApiError, ApiResponse, logger
    └── tests/                 # hand-rolled Node test harness
```

---

## 🎯 Core User Flow

```text
Dashboard
    ↓
Diagnose Crop
    ↓
Upload / Capture Leaf Image
    ↓
AI Analysis
    ↓
Diagnosis Result
    ↓
Recommended Actions
    ↓
Weather / Irrigation / Sustainability Insights
    ↓
Farmer Assistant
