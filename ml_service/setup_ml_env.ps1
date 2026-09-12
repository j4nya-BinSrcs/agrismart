# AgriSmart AI — ML Environment Setup Script (Windows PowerShell)
# Sets up an isolated Python 3.11 / 3.12 virtual environment for the ML microservice.

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AgriSmart AI SIH 2026 — ML Environment Setup" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Detect Python 3.11 or 3.12
$pythonExec = $null

if (Get-Command "py" -ErrorAction SilentlyContinue) {
    $pyList = py -0p | Out-String
    if ($pyList -match "-V:3\.11") {
        $pythonExec = "py -3.11"
        Write-Host "[✓] Found Python 3.11 via Python Launcher." -ForegroundColor Green
    } elseif ($pyList -match "-V:3\.12") {
        $pythonExec = "py -3.12"
        Write-Host "[✓] Found Python 3.12 via Python Launcher." -ForegroundColor Green
    }
}

if (-not $pythonExec) {
    # Check default python command
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        $rawVersion = & python --version 2>&1
        if ($rawVersion -match "Python 3\.1[12]") {
            $pythonExec = "python"
            Write-Host "[✓] Found compatible default Python: $rawVersion" -ForegroundColor Green
        }
    }
}

if (-not $pythonExec) {
    Write-Host "[X] ERROR: No compatible Python 3.11 or 3.12 installation detected." -ForegroundColor Red
    Write-Host "    PyTorch CUDA binary wheels for Windows require Python 3.10, 3.11, or 3.12." -ForegroundColor Red
    Write-Host "    Current host Python 3.14 is a pre-release and lacks compiled PyTorch wheels." -ForegroundColor Red
    Write-Host "`n    [ACTION REQUIRED]:" -ForegroundColor Yellow
    Write-Host "    1. Download and install Python 3.11 (64-bit) from:" -ForegroundColor Yellow
    Write-Host "       https://www.python.org/downloads/release/python-3119/" -ForegroundColor Cyan
    Write-Host "    2. Make sure to check 'Add python.exe to PATH' during installation." -ForegroundColor Yellow
    Write-Host "    3. Re-run this setup script: .\ml_service\setup_ml_env.ps1`n" -ForegroundColor Yellow
    Exit 1
}

# 2. Target venv directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$venvPath = Join-Path $scriptDir ".venv"

Write-Host "`n[1/3] Creating isolated virtual environment at: $venvPath" -ForegroundColor Cyan
if (-not (Test-Path $venvPath)) {
    & $pythonExec -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Failed to create virtual environment." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "      Virtual environment already exists." -ForegroundColor Gray
}

$venvPython = Join-Path $venvPath "Scripts\python.exe"
$venvPip = Join-Path $venvPath "Scripts\pip.exe"

# 3. Upgrade pip and install PyTorch with CUDA 12.4
Write-Host "`n[2/3] Installing PyTorch with CUDA 12.4 acceleration..." -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# 4. Install ML requirements
Write-Host "`n[3/3] Installing AgriSmart ML service dependencies..." -ForegroundColor Cyan
$reqFile = Join-Path $scriptDir "requirements.txt"
& $venvPip install -r $reqFile

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  [✓] AgriSmart ML Environment Setup Complete!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
Write-Host "To activate the environment in PowerShell:" -ForegroundColor Cyan
Write-Host "    & '$venvPath\Scripts\Activate.ps1'`n" -ForegroundColor White
Write-Host "To launch the FastAPI microservice:" -ForegroundColor Cyan
Write-Host "    python -m uvicorn ml_service.app:app --host 127.0.0.1 --port 8000`n" -ForegroundColor White
