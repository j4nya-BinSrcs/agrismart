# =============================================================================
# AgriSmart launch library (Bash)
# Modular helpers shared by ../../launch.sh
# =============================================================================

# shellcheck shell=bash

# --- Logging -----------------------------------------------------------------

_ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }

log()  { printf '%s [INFO]  %s\n' "$(_ts)" "$*"; }
warn() { printf '%s [WARN]  %s\n' "$(_ts)" "$*" >&2; }
err()  { printf '%s [ERROR] %s\n' "$(_ts)" "$*" >&2; }
die()  { err "$*"; exit 1; }

ok()   { printf '%s [OK]    %s\n' "$(_ts)" "$*"; }

# --- Config loading ----------------------------------------------------------

# Load KEY=VALUE files without executing arbitrary shell.
# Existing exported env vars win (are not overwritten).
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line key value
  # Strip UTF-8 BOM if present (common on Windows-edited files)
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#$'\xEF\xBB\xBF'}"
    # Strip comments / blanks
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    # Do not clobber already-exported values
    if [[ -n "${key}" && "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ && -z "${!key+x}" ]]; then
      export "${key}=${value}"
    fi
  done < "$file"
}

resolve_paths() {
  export AGRISMART_ROOT
  export RUN_DIR="${AGRISMART_ROOT}/${RUN_DIR:-.run}"
  export LOG_DIR="${AGRISMART_ROOT}/${LOG_DIR:-.run/logs}"
  export PID_DIR="${AGRISMART_ROOT}/${PID_DIR:-.run/pids}"
  export MONGO_DATA_DIR="${AGRISMART_ROOT}/${MONGO_DATA_DIR:-.run/mongodb-data}"

  mkdir -p "$LOG_DIR" "$PID_DIR" "$MONGO_DATA_DIR"

  # Resolve Chloromap directory
  local raw="${CHLOROMAP_DIR:-../chloromap}"
  if [[ "$raw" = /* ]]; then
    export CHLOROMAP_DIR="$raw"
  else
    export CHLOROMAP_DIR="$(cd "${AGRISMART_ROOT}/${raw}" 2>/dev/null && pwd || echo "${AGRISMART_ROOT}/${raw}")"
  fi

  if [[ "${CHLOROMAP_CHECKPOINT}" != /* ]]; then
    export CHLOROMAP_CHECKPOINT="${CHLOROMAP_DIR}/${CHLOROMAP_CHECKPOINT}"
  fi
}

bool_true() {
  local v
  v="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  case "$v" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

# --- Process helpers ---------------------------------------------------------

pid_file() { echo "${PID_DIR}/${1}.pid"; }
log_file() { echo "${LOG_DIR}/${1}.log"; }

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local name="$1"
  local f
  f="$(pid_file "$name")"
  [[ -f "$f" ]] || { echo ""; return 0; }
  tr -d '[:space:]' < "$f"
}

write_pid() {
  echo "$2" > "$(pid_file "$1")"
}

clear_pid() {
  rm -f "$(pid_file "$1")"
}

# Start a background command, capture PID + log.
# Usage: start_bg <name> <working_dir> <command...>
start_bg() {
  local name="$1"
  local cwd="$2"
  shift 2
  local lf pf
  lf="$(log_file "$name")"
  pf="$(pid_file "$name")"

  local existing
  existing="$(read_pid "$name")"
  if is_pid_running "$existing"; then
    warn "${name} already running (pid ${existing})"
    return 0
  fi

  (
    cd "$cwd" || exit 1
    nohup "$@" >>"$lf" 2>&1 &
    echo $! >"$pf"
  )

  # Brief settle so a crashing process is detected
  sleep 0.4
  local pid
  pid="$(read_pid "$name")"
  if is_pid_running "$pid"; then
    ok "Started ${name} (pid ${pid}) → ${lf}"
  else
    err "Failed to start ${name}. See ${lf}"
    return 1
  fi
}

stop_named() {
  local name="$1"
  local pid
  pid="$(read_pid "$name")"
  if ! is_pid_running "$pid"; then
    clear_pid "$name"
    log "${name} is not running"
    return 0
  fi

  log "Stopping ${name} (pid ${pid})..."
  kill "$pid" 2>/dev/null || true

  local i=0
  while is_pid_running "$pid" && (( i < 20 )); do
    sleep 0.25
    i=$((i + 1))
  done

  if is_pid_running "$pid"; then
    warn "${name} did not exit gracefully — sending SIGKILL"
    kill -9 "$pid" 2>/dev/null || true
  fi
  clear_pid "$name"
  ok "Stopped ${name}"
}

# --- Health checks -----------------------------------------------------------

wait_http() {
  local name="$1"
  local url="$2"
  local timeout="${3:-$HEALTH_TIMEOUT_SEC}"
  local elapsed=0
  local interval="${HEALTH_POLL_INTERVAL_SEC:-1}"

  log "Waiting for ${name} at ${url} (timeout ${timeout}s)..."
  while (( elapsed < timeout )); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      ok "${name} is healthy"
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  err "${name} did not become healthy within ${timeout}s (${url})"
  return 1
}

wait_tcp() {
  local name="$1"
  local host="$2"
  local port="$3"
  local timeout="${4:-$HEALTH_TIMEOUT_SEC}"
  local elapsed=0
  local interval="${HEALTH_POLL_INTERVAL_SEC:-1}"

  log "Waiting for ${name} on ${host}:${port}..."
  while (( elapsed < timeout )); do
    if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
      ok "${name} is accepting connections"
      return 0
    fi
    # Fallback if /dev/tcp unavailable
    if command -v nc >/dev/null 2>&1 && nc -z "$host" "$port" >/dev/null 2>&1; then
      ok "${name} is accepting connections"
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  err "${name} did not open ${host}:${port} within ${timeout}s"
  return 1
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

require_cmd() {
  command_exists "$1" || die "Required command not found: $1"
}
