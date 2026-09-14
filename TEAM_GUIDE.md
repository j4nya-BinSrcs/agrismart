# 🌾 AgriSmart — Team Setup & Collaboration Guide

Welcome to the **AgriSmart** project repository! This guide contains all the instructions your team needs to clone, configure, run, and collaborate across branches (`frontend` / `backend`).

---

## 📌 1. Project Architecture & Branch Overview

| Branch | Purpose | What it Contains |
| :--- | :--- | :--- |
| `main` | Production / Stable | Core stable release. |
| `backend` | **Active Full-Stack Development** | Complete stack: React Frontend + Express Backend. |
| `frontend` | UI/UX Prototyping | Dedicated frontend component development & mock testing. |

> 💡 **Recommendation for the Team:**
> Check out the **`backend`** branch for the most up-to-date end-to-end working system (Frontend + Backend APIs).

---

## 🛠️ 2. Prerequisites

Make sure you have installed on your computer:
1. **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
2. **Git**: Latest version ([Download Git](https://git-scm.com/))
3. **MongoDB** *(Optional)*: [MongoDB Community Server](https://www.mongodb.com/try/download/community) or MongoDB Atlas URI for full database persistence.

---

## 📥 3. First-Time Setup (Cloning the Project)

### Step 1: Open your Terminal / PowerShell
Open your terminal and navigate to the directory where you want to keep your project (e.g., `Documents` or `Projects`).

### Step 2: Clone the Repository
```bash
git clone https://github.com/kavyysachaniya/AgriSmart.git
cd AgriSmart
```

### Step 3: Switch to the Desired Branch
- **For Full-Stack (Frontend + Backend API):**
  ```bash
  git checkout backend
  ```
- **For Frontend Only:**
  ```bash
  git checkout frontend
  ```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Configure Environment Variables
Create your local `.env` configuration file from the template:

- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **macOS / Linux / Git Bash:**
  ```bash
  cp .env.example .env
  ```

*(Open `.env` in VS Code / notepad and fill in your `GEMINI_API_KEY` or `MONGODB_URI` if available).*

---

## 🚀 4. Running the Application

To run the complete system, open **two separate terminal windows/tabs** inside the `AgriSmart` folder:

### **Terminal 1: Backend Server (Port 5000)**
```bash
npm run server:dev
```
- Starts the Express API server with live reloading on `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/v1/health`

### **Terminal 2: Frontend App (Port 3000)**
```bash
npm run dev
```
- Starts the Vite React development server on `http://localhost:3000`

👉 **Open your browser and visit:** [`http://localhost:3000`](http://localhost:3000)

---

## 👥 5. Daily Team Workflow (Git Guidelines)

### A. Pulling Latest Updates Before You Start Working
Always pull the latest changes so you are in sync with your teammates:
```bash
git checkout backend
git pull origin backend
```

### B. Committing and Pushing Your Changes
After you write or modify code:

#### **Windows PowerShell:**
```powershell
# 1. Check changed files
git status

# 2. Stage all modifications
git add .

# 3. Commit with a meaningful message
git commit -m "feat: your feature description"

# 4. Push to the branch
git push origin backend
```

#### **Quick Single-Line Command (PowerShell):**
```powershell
git add . ; git commit -m "feat: description of changes" ; git push origin backend
```

---

## 🔀 6. Working Across Frontend & Backend Branches

If team members want to work on separate features without conflicts:

### Creating a Feature Branch:
```bash
# Branch off from backend
git checkout backend
git pull origin backend
git checkout -b feat/my-new-feature

# Work on your code, then commit and push:
git add .
git commit -m "feat: add weather radar component"
git push -u origin feat/my-new-feature
```

### Merging Feature into `backend`:
Once your feature is tested, you can merge it back into `backend`:
```bash
git checkout backend
git pull origin backend
git merge feat/my-new-feature
git push origin backend
```

---

## 🐞 7. Common Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **`Port 5000 or 3000 already in use`** | Close previous terminal sessions or restart terminal. |
| **`The token '&&' is not valid` (PowerShell)** | Use `;` instead of `&&` in Windows PowerShell. |
| **`Cannot find module ...`** | Run `npm install` again in the root folder. |
| **`MongoDB connection error`** | Ensure MongoDB is running locally or put a valid MongoDB Atlas connection string in `.env`. The app also supports fallback/mock modes. |

---

### 🎉 Happy Coding!
For any queries, coordinate with the repository maintainers.
