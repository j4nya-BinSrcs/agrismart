# =============================================================================
# Node apps + Chloromap ML helpers (PowerShell)
# =============================================================================

function Ensure-NodeDeps {
    Assert-Command 'node'
    Assert-Command 'npm'

    $needInstall = $false
    if (Test-BoolTrue $env:FORCE_INSTALL) {
        $needInstall = $true
    } elseif (-not (Test-Path (Join-Path $env:AGRISMART_ROOT 'node_modules'))) {
        $needInstall = $true
    }

    if ($needInstall) {
        Write-Info 'Installing npm dependencies (workspaces)...'
        Push-Location $env:AGRISMART_ROOT
        try {
            npm install
        } finally {
            Pop-Location
        }
        Write-Ok 'npm install complete'
    } else {
        Write-Info 'npm dependencies present — skipping install (-ForceInstall to refresh)'
    }
}

function Ensure-DotEnv {
    $envPath = Join-Path $env:AGRISMART_ROOT '.env'
    $example = Join-Path $env:AGRISMART_ROOT '.env.example'
    if (-not (Test-Path $envPath) -and (Test-Path $example)) {
        Write-Warn '.env missing — copying from .env.example'
        Copy-Item $example $envPath
    }

    if (-not $env:MONGODB_URI) { $env:MONGODB_URI = 'mongodb://127.0.0.1:27017/agrismart' }
    if (-not $env:CHLOROMAP_URL) { $env:CHLOROMAP_URL = "http://127.0.0.1:$($env:ML_PORT)" }
    if (-not $env:PORT) { $env:PORT = $env:SERVER_PORT }
    if (-not $env:CORS_ORIGIN) { $env:CORS_ORIGIN = "http://localhost:$($env:CLIENT_PORT)" }
    if (-not $env:NODE_ENV) { $env:NODE_ENV = 'development' }
}

function Start-AgriServer {
    if (-not (Test-BoolTrue $env:ENABLE_SERVER)) {
        Write-Info 'API server skipped (-NoServer)'
        return
    }
    Ensure-DotEnv

    $npm = (Get-Command npm).Source
    Start-ManagedProcess -Name 'server' -WorkingDirectory $env:AGRISMART_ROOT `
        -FilePath $npm `
        -ArgumentList @('run', 'dev:server') `
        -Environment @{
            PORT          = $env:SERVER_PORT
            MONGODB_URI   = $env:MONGODB_URI
            CHLOROMAP_URL = $env:CHLOROMAP_URL
            CORS_ORIGIN   = $env:CORS_ORIGIN
            NODE_ENV      = $env:NODE_ENV
        }

    Wait-HttpHealthy -Name 'API server' -Url "http://127.0.0.1:$($env:SERVER_PORT)/api/v1/health" `
        -TimeoutSec ([int]$env:HEALTH_TIMEOUT_SEC)
}

function Start-AgriClient {
    if (-not (Test-BoolTrue $env:ENABLE_CLIENT)) {
        Write-Info 'Client skipped (-NoClient)'
        return
    }

    $npm = (Get-Command npm).Source
    Start-ManagedProcess -Name 'client' -WorkingDirectory $env:AGRISMART_ROOT `
        -FilePath $npm `
        -ArgumentList @('run', 'dev:client') `
        -Environment @{
            VITE_API_URL = "http://localhost:$($env:SERVER_PORT)/api/v1"
        }

    Wait-HttpHealthy -Name 'Vite client' -Url "http://127.0.0.1:$($env:CLIENT_PORT)/" `
        -TimeoutSec ([int]$env:HEALTH_TIMEOUT_SEC)
}

function Get-MlPythonRunner {
    $mode = if ($env:ML_PYTHON_MODE) { $env:ML_PYTHON_MODE } else { 'auto' }
    $venvPy = Join-Path $env:CHLOROMAP_DIR '.venv/Scripts/python.exe'
    $venvPyUnix = Join-Path $env:CHLOROMAP_DIR '.venv/bin/python'

    switch ($mode) {
        'venv' {
            if (Test-Path $venvPy) { return @{ Kind = 'python'; Path = $venvPy } }
            if (Test-Path $venvPyUnix) { return @{ Kind = 'python'; Path = $venvPyUnix } }
            throw "Chloromap venv not found under $($env:CHLOROMAP_DIR)"
        }
        'uv' {
            Assert-Command 'uv'
            return @{ Kind = 'uv'; Path = 'uv' }
        }
        'python' {
            $py = Get-Command python -ErrorAction SilentlyContinue
            if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
            if (-not $py) { throw 'python not found' }
            return @{ Kind = 'python'; Path = $py.Source }
        }
        default {
            if (Test-Path $venvPy) { return @{ Kind = 'python'; Path = $venvPy } }
            if (Test-Path $venvPyUnix) { return @{ Kind = 'python'; Path = $venvPyUnix } }
            if (Get-Command uv -ErrorAction SilentlyContinue) { return @{ Kind = 'uv'; Path = 'uv' } }
            $py = Get-Command python -ErrorAction SilentlyContinue
            if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
            if (-not $py) { throw 'No Python runner available for Chloromap' }
            return @{ Kind = 'python'; Path = $py.Source }
        }
    }
}

function Start-AgriMl {
    if (-not (Test-BoolTrue $env:ENABLE_ML)) {
        Write-Info 'Chloromap ML skipped (-NoMl)'
        return
    }
    if (-not (Test-Path -LiteralPath $env:CHLOROMAP_DIR)) {
        Write-Warn "Chloromap directory not found at $($env:CHLOROMAP_DIR) — skipping ML"
        return
    }
    if (-not (Test-Path -LiteralPath $env:CHLOROMAP_CHECKPOINT)) {
        Write-Warn "Checkpoint missing: $($env:CHLOROMAP_CHECKPOINT) — skipping ML"
        return
    }

    $serve = Join-Path $env:CHLOROMAP_DIR 'scripts/serve.py'
    if (-not (Test-Path $serve)) { throw "Missing $serve" }

    $runner = Get-MlPythonRunner
    Write-Info "Starting Chloromap ML with runner=$($runner.Path)"

    if ($runner.Kind -eq 'uv') {
        Start-ManagedProcess -Name 'ml' -WorkingDirectory $env:CHLOROMAP_DIR `
            -FilePath 'uv' `
            -ArgumentList @(
                'run', 'python', 'scripts/serve.py',
                '--host', $env:ML_HOST,
                '--port', $env:ML_PORT,
                '--checkpoint', "`"$($env:CHLOROMAP_CHECKPOINT)`""
            )
    } else {
        Start-ManagedProcess -Name 'ml' -WorkingDirectory $env:CHLOROMAP_DIR `
            -FilePath $runner.Path `
            -ArgumentList @(
                'scripts/serve.py',
                '--host', $env:ML_HOST,
                '--port', $env:ML_PORT,
                '--checkpoint', "`"$($env:CHLOROMAP_CHECKPOINT)`""
            )
    }

    Wait-HttpHealthy -Name 'Chloromap ML' -Url "http://127.0.0.1:$($env:ML_PORT)/health" `
        -TimeoutSec ([int]$env:HEALTH_TIMEOUT_SEC)
}

function Show-AgriStatus {
    Write-Host ''
    Write-Host 'AgriSmart stack status'
    Write-Host '----------------------'
    foreach ($name in @('mongodb', 'server', 'client', 'ml')) {
        $pidValue = Read-ManagedPid $name
        if (Test-ManagedRunning $pidValue) {
            Write-Host ("  {0,-10}  running  ({1})" -f $name, $pidValue)
        } else {
            Write-Host ("  {0,-10}  stopped" -f $name)
        }
    }
    Write-Host ''
    Write-Host 'Endpoints (when up):'
    Write-Host "  Client   http://localhost:$($env:CLIENT_PORT)"
    Write-Host "  API      http://localhost:$($env:SERVER_PORT)/api/v1/health"
    Write-Host "  ML       http://localhost:$($env:ML_PORT)/health"
    Write-Host "  MongoDB  $($env:MONGODB_URI)"
    Write-Host ''
}

function Show-Banner {
    Write-Host @'

  ╔══════════════════════════════════════════════════════════╗
  ║                   AgriSmart launcher                     ║
  ║   client · api · mongodb · chloromap ml                  ║
  ╚══════════════════════════════════════════════════════════╝

'@
}
