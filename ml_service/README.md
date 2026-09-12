# 🌿 AgriSmart AI — Machine Learning Microservice (SIH 2026)

> **SIH 2026 Problem Statement:** AI-Powered Crop Disease Detection and Agronomic Guidance for Sustainable Agriculture.
> This module contains the PyTorch deep-learning pipeline and FastAPI microservice for foliar crop disease classification.

---

## 📋 System & Hardware Requirements

- **Operating System:** Windows 10 / 11 (64-bit) or Linux (Ubuntu 22.04+)
- **Target GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (6.0 GB VRAM)
- **CUDA Support:** CUDA 12.1 / 12.4
- **Python Version:** **Python 3.11 (64-bit)** or **Python 3.12 (64-bit)**
  *(Note: Host system Python 3.14 lacks compiled PyTorch CUDA wheels; Python 3.11 is strongly recommended).*

---

## 🚀 Environment Setup

### 1. Automated Setup (PowerShell)
From the project root:

```powershell
.\ml_service\setup_ml_env.ps1
```

This script will:
1. Detect Python 3.11 / 3.12 via Python Launcher (`py -3.11`).
2. Create an isolated virtual environment at `ml_service/.venv`.
3. Install PyTorch with CUDA 12.4 binary wheels.
4. Install all dependencies from `ml_service/requirements.txt`.

### 2. Manual Setup
```powershell
# Create virtual environment using Python 3.11
py -3.11 -m venv ml_service/.venv

# Activate environment
.\ml_service\.venv\Scripts\Activate.ps1

# Install PyTorch with CUDA 12.4 acceleration
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Install AgriSmart ML requirements
pip install -r ml_service/requirements.txt
```

---

## 📊 Dataset Structure & Strict SIH Evaluation Protocol

### ⚠️ SIH Architectural Protocol:

1. **PlantVillage Training & Validation Data (`ml_service/data/plantvillage/`):**
   - **Training:** 85% used strictly for model fitting and backpropagation.
   - **Validation:** 15% used strictly for validation, early stopping, and hyperparameter selection.
   - **Optional Internal Test (`plantvillage/internal_test/`):** Synthetic internal debug split. **NEVER** labeled as or substituted for the SIH field test.

2. **SIH Held-Out Field-Condition Test Set (`ml_service/data/field_test/`):**
   - Dedicated separate dataset captured under varying natural illumination, complex soil backgrounds, and field angles.
   - **STRICT PROHIBITION:** MUST NEVER be accessed, scanned, or evaluated during the training loop. Used only by `evaluate.py --eval-type field_test` for final judging.

```text
ml_service/data/
├── plantvillage/               # Training & Validation Data (git-ignored)
│   ├── Tomato___Early_blight/
│   │   ├── leaf1.jpg
│   │   └── leaf2.jpg
│   ├── Tomato___Late_blight/
│   ├── Tomato___healthy/
│   ├── Potato___Early_blight/
│   ├── Potato___Late_blight/
│   └── Potato___healthy/
│
└── field_test/                 # SIH Held-Out Judging Test Set (git-ignored)
    ├── Tomato___Early_blight/
    └── ...
```

---

## 🔍 Pre-Flight Dataset Verification

Before initiating training, verify your PlantVillage dataset structure:

```powershell
python -m ml_service.validate_data --data-dir ml_service/data/plantvillage
```

---

## ⚡ Model Training Pipeline (When Dataset is Ready)

Train the EfficientNet-B0 transfer learning model on PlantVillage with Automatic Mixed Precision (AMP FP16), AdamW, and Cosine Annealing:

```powershell
python -m ml_service.training.train --data-root ml_service/data/plantvillage --epochs 25 --batch-size 32
```

### Key Training Highlights:
- **Automatic Mixed Precision (AMP FP16):** Optimizes memory usage for 6GB VRAM.
- **Dynamic Class Discovery:** Dynamically detects class subfolders without hardcoding.
- **Model Selection Metric:** Checkpoint saving is strictly driven by **Validation Macro-F1** (`ml_service/models/best_crop_model.pth`).
- **Reproducibility:** Pinned seed (`seed: 42`) across PyTorch, NumPy, and random.
- **Training History:** Output metrics saved to `ml_service/reports/training_history.json`.

---

## 🎯 Model Evaluation

### A. Evaluate on PlantVillage Validation Split:
```powershell
python -m ml_service.training.evaluate --data-dir ml_service/data/plantvillage --checkpoint ml_service/models/best_crop_model.pth --eval-type validation
```

### B. Evaluate on SIH Held-Out Field-Condition Test Set:
```powershell
python -m ml_service.training.evaluate --data-dir ml_service/data/field_test --checkpoint ml_service/models/best_crop_model.pth --eval-type field_test
```

### Generated Artifacts:
- `ml_service/reports/evaluation_*.json` (Macro-F1, Accuracy, per-class Precision/Recall/F1, full confusion matrix, dataset metadata)
- `ml_service/reports/confusion_matrix_*.png` (High-resolution heatmap visualization)

---

## 🌐 Running the FastAPI Microservice

Start the microservice on Port 8000:

```powershell
python -m uvicorn ml_service.app:app --host 127.0.0.1 --port 8000 --reload
```

- **Health Check:** `http://127.0.0.1:8000/health`
- **Predict Endpoint:** `http://127.0.0.1:8000/predict` (Invoked by Node.js backend `mlClient.js`).