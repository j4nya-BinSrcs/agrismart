# =============================================================================
# AgriSmart launch library (PowerShell)
# Shared by ../../launch.ps1
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Timestamp {
    (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}

function Write-Log {
    param([Parameter(Mandatory)][string]$Message, [string]$Level = 'INFO')
    $line = "$(Get-Timestamp) [$Level]  $Message"
    if ($Level -eq 'ERROR' -or $Level -eq 'WARN') {
        [Console]::Error.WriteLine($line)
    } else {
        Write-Host $line
    }
}

function Write-Info { param([string]$Message) Write-Log -Message $Message -Level 'INFO' }
function Write-Warn { param([string]$Message) Write-Log -Message $Message -Level 'WARN' }
function Write-Err  { param([string]$Message) Write-Log -Message $Message -Level 'ERROR' }
function Write-Ok   { param([string]$Message) Write-Log -Message $Message -Level 'OK' }

function Test-BoolTrue {
    param([string]$Value)
    switch -Regex ($Value.ToLowerInvariant()) {
        '^(1|true|yes|on)$' { return $true }
        default { return $false }
    }
}

function Import-EnvFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        # Strip UTF-8 BOM if present
        if ($line.Length -gt 0 -and [int][char]$line[0] -eq 0xFEFF) {
            $line = $line.Substring(1).Trim()
        }
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1)
        if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { return }
        # Do not clobber already-set process env
        $existing = [Environment]::GetEnvironmentVariable($key, 'Process')
        if ([string]::IsNullOrEmpty($existing)) {
            Set-Item -Path "Env:$key" -Value $value
        }
    }
}

function Resolve-LaunchPaths {
    param([Parameter(Mandatory)][string]$Root)

    $env:AGRISMART_ROOT = $Root

    if ([string]::IsNullOrWhiteSpace($env:RUN_DIR)) { $env:RUN_DIR = '.run' }
    if ([string]::IsNullOrWhiteSpace($env:LOG_DIR)) { $env:LOG_DIR = '.run/logs' }
    if ([string]::IsNullOrWhiteSpace($env:PID_DIR)) { $env:PID_DIR = '.run/pids' }
    if ([string]::IsNullOrWhiteSpace($env:MONGO_DATA_DIR)) { $env:MONGO_DATA_DIR = '.run/mongodb-data' }

    # If relative, anchor under repo root
    if (-not [System.IO.Path]::IsPathRooted($env:RUN_DIR)) { $env:RUN_DIR = Join-Path $Root $env:RUN_DIR }
    if (-not [System.IO.Path]::IsPathRooted($env:LOG_DIR)) { $env:LOG_DIR = Join-Path $Root $env:LOG_DIR }
    if (-not [System.IO.Path]::IsPathRooted($env:PID_DIR)) { $env:PID_DIR = Join-Path $Root $env:PID_DIR }
    if (-not [System.IO.Path]::IsPathRooted($env:MONGO_DATA_DIR)) { $env:MONGO_DATA_DIR = Join-Path $Root $env:MONGO_DATA_DIR }

    New-Item -ItemType Directory -Force -Path $env:LOG_DIR, $env:PID_DIR, $env:MONGO_DATA_DIR | Out-Null

    if ([string]::IsNullOrWhiteSpace($env:CHLOROMAP_DIR)) { $env:CHLOROMAP_DIR = '../chloromap' }
    $raw = $env:CHLOROMAP_DIR
    if ([System.IO.Path]::IsPathRooted($raw)) {
        $env:CHLOROMAP_DIR = $raw
    } else {
        $resolved = Join-Path $Root $raw
        if (Test-Path -LiteralPath $resolved) {
            $env:CHLOROMAP_DIR = (Resolve-Path -LiteralPath $resolved).Path
        } else {
            $env:CHLOROMAP_DIR = $resolved
        }
    }

    if ([string]::IsNullOrWhiteSpace($env:CHLOROMAP_CHECKPOINT)) {
        $env:CHLOROMAP_CHECKPOINT = 'weights/best_model.pth'
    }
    if (-not [System.IO.Path]::IsPathRooted($env:CHLOROMAP_CHECKPOINT)) {
        $env:CHLOROMAP_CHECKPOINT = Join-Path $env:CHLOROMAP_DIR $env:CHLOROMAP_CHECKPOINT
    }
}

function Get-PidFile { param([string]$Name) Join-Path $env:PID_DIR "$Name.pid" }
function Get-LogFile { param([string]$Name) Join-Path $env:LOG_DIR "$Name.log" }

function Read-ManagedPid {
    param([string]$Name)
    $f = Get-PidFile $Name
    if (-not (Test-Path -LiteralPath $f)) { return $null }
    (Get-Content -LiteralPath $f -Raw).Trim()
}

function Write-ManagedPid {
    param([string]$Name, [string]$PidValue)
    Set-Content -LiteralPath (Get-PidFile $Name) -Value $PidValue -NoNewline
}

function Clear-ManagedPid {
    param([string]$Name)
    $f = Get-PidFile $Name
    if (Test-Path -LiteralPath $f) { Remove-Item -LiteralPath $f -Force }
}

function Test-ManagedRunning {
    param([string]$PidValue)
    if ([string]::IsNullOrWhiteSpace($PidValue)) { return $false }
    if ($PidValue.StartsWith('docker:')) {
        $container = $PidValue.Substring(7)
        $names = docker ps --format '{{.Names}}' 2>$null
        return ($names -split "`n") -contains $container
    }
    $id = 0
    if (-not [int]::TryParse($PidValue, [ref]$id)) { return $false }
    try {
        $p = Get-Process -Id $id -ErrorAction Stop
        return $null -ne $p
    } catch {
        return $false
    }
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [hashtable]$Environment = @{}
    )

    $existing = Read-ManagedPid $Name
    if (Test-ManagedRunning $existing) {
        Write-Warn "$Name already running (pid $existing)"
        return
    }

    $log = Get-LogFile $Name
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ($ArgumentList -join ' ')
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    foreach ($key in [Environment]::GetEnvironmentVariables('Process').Keys) {
        $psi.Environment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    }
    foreach ($k in $Environment.Keys) {
        $psi.Environment[$k] = [string]$Environment[$k]
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $null = $proc.Start()

    # Async log writers
    $logLock = New-Object object
    $outHandler = {
        if (-not [string]::IsNullOrEmpty($EventArgs.Data)) {
            Add-Content -LiteralPath $Event.MessageData -Value $EventArgs.Data
        }
    }
    Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action $outHandler -MessageData $log | Out-Null
    Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action $outHandler -MessageData $log | Out-Null
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Write-ManagedPid -Name $Name -PidValue $proc.Id
    Start-Sleep -Milliseconds 400
    if (Test-ManagedRunning $proc.Id) {
        Write-Ok "Started $Name (pid $($proc.Id)) → $log"
    } else {
        throw "Failed to start $Name. See $log"
    }
}

function Stop-ManagedProcess {
    param([Parameter(Mandatory)][string]$Name)

    $pidValue = Read-ManagedPid $Name
    if (-not (Test-ManagedRunning $pidValue)) {
        Clear-ManagedPid $Name
        Write-Info "$Name is not running"
        return
    }

    if ($pidValue.StartsWith('docker:')) {
        $container = $pidValue.Substring(7)
        Write-Info "Stopping Docker container $container..."
        docker stop $container 2>$null | Out-Null
        Clear-ManagedPid $Name
        Write-Ok "Stopped $Name (docker)"
        return
    }

    Write-Info "Stopping $Name (pid $pidValue)..."
    try {
        Stop-Process -Id ([int]$pidValue) -Force -ErrorAction Stop
    } catch {
        Write-Warn "Could not stop pid ${pidValue}: $_"
    }
    Clear-ManagedPid $Name
    Write-Ok "Stopped $Name"
}

function Wait-HttpHealthy {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSec = 60
    )
    Write-Info "Waiting for $Name at $Url (timeout ${TimeoutSec}s)..."
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                Write-Ok "$Name is healthy"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "$Name did not become healthy within ${TimeoutSec}s ($Url)"
}

function Wait-TcpOpen {
    param(
        [string]$Name,
        [string]$HostName = '127.0.0.1',
        [int]$Port,
        [int]$TimeoutSec = 60
    )
    Write-Info "Waiting for $Name on ${HostName}:${Port}..."
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect($HostName, $Port, $null, $null)
            $ok = $iar.AsyncWaitHandle.WaitOne(500)
            if ($ok -and $client.Connected) {
                $client.Close()
                Write-Ok "$Name is accepting connections"
                return
            }
            $client.Close()
        } catch {
            # retry
        }
        Start-Sleep -Seconds 1
    }
    throw "$Name did not open ${HostName}:${Port} within ${TimeoutSec}s"
}

function Test-TcpOpen {
    param([string]$HostName = '127.0.0.1', [int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(400)
        $connected = $ok -and $client.Connected
        $client.Close()
        return $connected
    } catch {
        return $false
    }
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}
