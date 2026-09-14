# =============================================================================
# AgriSmart — production-grade full-stack launcher (Windows PowerShell 7+)
# -----------------------------------------------------------------------------
# Starts (in order):
#   1. MongoDB          (reuse existing · local mongod · Docker)
#   2. API server       (Express / tsx watch on :5000)
#   3. Vite client      (:3000)
#   4. Chloromap ML     (FastAPI on :8000)  — optional sibling repo
#
# Usage:
#   .\launch.ps1
#   .\launch.ps1 up -NoMl
#   .\launch.ps1 down
#   .\launch.ps1 status
#   .\launch.ps1 logs -Service server
#   .\launch.ps1 restart
#
# Configuration (priority high → low):
#   process env  >  scripts/launch/local.env  >  scripts/launch/defaults.env
#
# Requires: PowerShell 7+, Node.js 18+, npm
# Optional: mongod | Docker, uv / Python 3.13 + chloromap/.venv
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'start', 'down', 'stop', 'status', 'logs', 'restart')]
    [string]$Command = 'up',

    [switch]$Detach,
    [switch]$NoDb,
    [switch]$NoServer,
    [switch]$NoClient,
    [switch]$NoMl,
    [switch]$ForceInstall,

    [ValidateSet('all', 'server', 'client', 'ml', 'mongodb')]
    [string]$Service = 'all'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AgrismartRoot = $PSScriptRoot
$LaunchLib = Join-Path $AgrismartRoot 'scripts/launch/pwsh'

. (Join-Path $LaunchLib 'Common.ps1')
. (Join-Path $LaunchLib 'MongoDB.ps1')
. (Join-Path $LaunchLib 'Services.ps1')

Import-EnvFile (Join-Path $AgrismartRoot 'scripts/launch/defaults.env')
Import-EnvFile (Join-Path $AgrismartRoot 'scripts/launch/local.env')
Import-EnvFile (Join-Path $AgrismartRoot '.env')
Resolve-LaunchPaths -Root $AgrismartRoot

if ($NoDb) { $env:ENABLE_DB = 'false' }
if ($NoServer) { $env:ENABLE_SERVER = 'false' }
if ($NoClient) { $env:ENABLE_CLIENT = 'false' }
if ($NoMl) { $env:ENABLE_ML = 'false' }
if ($ForceInstall) { $env:FORCE_INSTALL = 'true' }

# Normalize numeric timeouts
if (-not $env:HEALTH_TIMEOUT_SEC) { $env:HEALTH_TIMEOUT_SEC = '60' }
if (-not $env:CLIENT_PORT) { $env:CLIENT_PORT = '3000' }
if (-not $env:SERVER_PORT) { $env:SERVER_PORT = '5000' }
if (-not $env:ML_PORT) { $env:ML_PORT = '8000' }
if (-not $env:ML_HOST) { $env:ML_HOST = '0.0.0.0' }
if (-not $env:MONGO_PORT) { $env:MONGO_PORT = '27017' }
if (-not $env:MONGO_BIND) { $env:MONGO_BIND = '127.0.0.1' }

$script:Supervisor = $false

function Stop-AgriStack {
    Write-Info 'Stopping AgriSmart stack...'
    if (Test-BoolTrue $env:ENABLE_CLIENT) { Stop-ManagedProcess -Name 'client' }
    if (Test-BoolTrue $env:ENABLE_SERVER) { Stop-ManagedProcess -Name 'server' }
    if (Test-BoolTrue $env:ENABLE_ML) { Stop-ManagedProcess -Name 'ml' }
    if (Test-BoolTrue $env:ENABLE_DB) { Stop-AgriMongo }
    Show-AgriStatus
}

function Start-AgriStack {
    Show-Banner
    Write-Info "Root: $env:AGRISMART_ROOT"
    Write-Info "Chloromap: $env:CHLOROMAP_DIR"
    Write-Info "Logs: $env:LOG_DIR"

    Ensure-NodeDeps
    Ensure-DotEnv

    Start-AgriMongo
    Start-AgriServer
    Start-AgriClient
    Start-AgriMl

    Show-AgriStatus

    Write-Host @"
Ready.
  Open the app:     http://localhost:$($env:CLIENT_PORT)
  API health:       http://localhost:$($env:SERVER_PORT)/api/v1/health
  Chloromap health: http://localhost:$($env:ML_PORT)/health

"@

    if ($Detach) {
        Write-Ok 'Detached mode — processes keep running. Use .\launch.ps1 down to stop.'
        return
    }

    $script:Supervisor = $true
    Write-Info 'Supervisor running — press Ctrl+C to stop all managed services.'

    try {
        while ($true) {
            Start-Sleep -Seconds 2
            if ((Test-BoolTrue $env:ENABLE_SERVER) -and -not (Test-ManagedRunning (Read-ManagedPid 'server'))) {
                throw "API server exited unexpectedly — check $(Get-LogFile 'server')"
            }
            if ((Test-BoolTrue $env:ENABLE_CLIENT) -and -not (Test-ManagedRunning (Read-ManagedPid 'client'))) {
                throw "Vite client exited unexpectedly — check $(Get-LogFile 'client')"
            }
        }
    } finally {
        if ($script:Supervisor) {
            Write-Host ''
            Write-Info 'Shutting down AgriSmart stack...'
            if (Test-BoolTrue $env:ENABLE_CLIENT) { Stop-ManagedProcess -Name 'client' }
            if (Test-BoolTrue $env:ENABLE_SERVER) { Stop-ManagedProcess -Name 'server' }
            if (Test-BoolTrue $env:ENABLE_ML) { Stop-ManagedProcess -Name 'ml' }
            if ($env:AGRISMART_MONGO_MANAGED -eq 'true' -or $env:AGRISMART_MONGO_MANAGED -eq 'docker') {
                Stop-AgriMongo
            } else {
                Write-Info 'Leaving pre-existing MongoDB running'
            }
            Write-Ok 'Stack stopped'
        }
    }
}

function Show-AgriLogs {
    $files = @()
    switch ($Service) {
        'all' {
            $files = Get-ChildItem -Path $env:LOG_DIR -Filter '*.log' -ErrorAction SilentlyContinue
        }
        default {
            $f = Get-LogFile $Service
            if (Test-Path $f) { $files = @(Get-Item $f) }
        }
    }
    if (-not $files -or $files.Count -eq 0) {
        throw "No log files found under $($env:LOG_DIR)"
    }
    Write-Info ("Tailing: " + ($files.FullName -join ', '))
    Get-Content -Path $files.FullName -Wait -Tail 100
}

switch ($Command) {
    { $_ -in 'up', 'start' } { Start-AgriStack }
    { $_ -in 'down', 'stop' } { Stop-AgriStack }
    'restart' {
        Stop-AgriStack
        $Detach = $true
        Start-AgriStack
    }
    'status' { Show-AgriStatus }
    'logs' { Show-AgriLogs }
}
