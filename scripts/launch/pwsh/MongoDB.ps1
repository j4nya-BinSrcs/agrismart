# =============================================================================
# MongoDB helpers (PowerShell)
# =============================================================================

function Start-AgriMongo {
    if (-not (Test-BoolTrue $env:ENABLE_DB)) {
        Write-Info 'MongoDB skipped (--no-db / ENABLE_DB=false)'
        return
    }

    $bind = if ($env:MONGO_BIND) { $env:MONGO_BIND } else { '127.0.0.1' }
    $port = [int]($(if ($env:MONGO_PORT) { $env:MONGO_PORT } else { 27017 }))

    if (Test-TcpOpen -HostName $bind -Port $port) {
        Write-Ok "MongoDB already running on ${bind}:${port} — reusing"
        $env:AGRISMART_MONGO_MANAGED = 'false'
        return
    }

    $mongod = Get-Command mongod -ErrorAction SilentlyContinue
    if (-not $mongod) {
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            Write-Info 'mongod not found — starting MongoDB via Docker...'
            $container = 'agrismart-mongo'
            $existing = docker ps -a --format '{{.Names}}' 2>$null
            if (($existing -split "`n") -contains $container) {
                docker start $container | Out-Null
            } else {
                docker run -d --name $container `
                    -p "${port}:27017" `
                    -v "$($env:MONGO_DATA_DIR):/data/db" `
                    mongo:7 | Out-Null
            }
            Write-ManagedPid -Name 'mongodb' -PidValue "docker:$container"
            $env:AGRISMART_MONGO_MANAGED = 'docker'
            Wait-TcpOpen -Name 'MongoDB' -HostName '127.0.0.1' -Port $port -TimeoutSec ([int]$env:HEALTH_TIMEOUT_SEC)
            return
        }
        throw "Neither 'mongod' nor 'docker' is available. Install MongoDB or Docker, or pass -NoDb."
    }

    New-Item -ItemType Directory -Force -Path $env:MONGO_DATA_DIR | Out-Null
    $log = Get-LogFile 'mongodb'
    Write-Info "Starting local mongod (dbpath=$($env:MONGO_DATA_DIR))..."

    # Windows mongod typically does not --fork; run as managed process.
    Start-ManagedProcess -Name 'mongodb' -WorkingDirectory $env:AGRISMART_ROOT `
        -FilePath $mongod.Source `
        -ArgumentList @(
            "--dbpath `"$($env:MONGO_DATA_DIR)`"",
            "--bind_ip $bind",
            "--port $port"
        )

    $env:AGRISMART_MONGO_MANAGED = 'true'
    Wait-TcpOpen -Name 'MongoDB' -HostName $bind -Port $port -TimeoutSec ([int]$env:HEALTH_TIMEOUT_SEC)
}

function Stop-AgriMongo {
    if (-not (Test-BoolTrue $env:ENABLE_DB)) { return }
    Stop-ManagedProcess -Name 'mongodb'
}
