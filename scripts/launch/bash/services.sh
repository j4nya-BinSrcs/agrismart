# =============================================================================
# Node (API + Vite client) and Chloromap ML service helpers
# =============================================================================

# shellcheck shell=bash

ensure_node_deps() {
  require_cmd node
  require_cmd npm

  local need_install=false
  if bool_true "${FORCE_INSTALL:-false}"; then
    need_install=true
  elif [[ ! -d "${AGRISMART_ROOT}/node_modules" ]]; then
    need_install=true
  elif [[ ! -d "${AGRISMART_ROOT}/client/node_modules" && ! -d "${AGRISMART_ROOT}/node_modules/@agrismart" ]]; then
    # workspaces may hoist; still ensure root install ran once
    need_install=true
  fi

  if bool_true "$need_install"; then
    log "Installing npm dependencies (workspaces)..."
    (cd "${AGRISMART_ROOT}" && npm install)
    ok "npm install complete"
  else
    log "npm dependencies present — skipping install (FORCE_INSTALL=true to refresh)"
  fi
}

# Ensure Chloromap ML dependencies are installed (uv sync on first run)
ensure_ml_deps() {
  if ! bool_true "${ENABLE_ML:-true}"; then
    return 0
  fi
  if [[ ! -d "${CHLOROMAP_DIR}" ]]; then
    return 0
  fi

  local venv_py="${CHLOROMAP_DIR}/.venv/bin/python"
  if [[ -x "$venv_py" ]]; then
    log "Chloromap venv present — skipping uv sync (FORCE_INSTALL=true to refresh)"
    return 0
  fi

  if command_exists uv; then
    log "Installing Chloromap ML dependencies (uv sync)..."
    (cd "${CHLOROMAP_DIR}" && uv sync)
    ok "uv sync complete"
  else
    warn "'uv' not found — skipping Chloromap dep install. Install uv or run 'uv sync' manually in chloromap/"
  fi
}

# Ensure project .env exists so the server can boot
ensure_dotenv() {
  if [[ ! -f "${AGRISMART_ROOT}/.env" && -f "${AGRISMART_ROOT}/.env.example" ]]; then
    warn ".env missing — copying from .env.example"
    cp "${AGRISMART_ROOT}/.env.example" "${AGRISMART_ROOT}/.env"
  fi

  # Inject/refresh CHLOROMAP_URL and MONGODB_URI for this session into process env
  export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/agrismart}"
  export CHLOROMAP_URL="${CHLOROMAP_URL:-http://127.0.0.1:8000}"
  export PORT="${SERVER_PORT:-5000}"
  export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:${CLIENT_PORT:-3000}}"
  export NODE_ENV="${NODE_ENV:-development}"
}

start_server() {
  if ! bool_true "${ENABLE_SERVER:-true}"; then
    log "API server skipped (--no-server)"
    return 0
  fi

  ensure_dotenv
  local lf
  lf="$(log_file server)"

  start_bg server "${AGRISMART_ROOT}" \
    env PORT="${SERVER_PORT}" \
        MONGODB_URI="${MONGODB_URI}" \
        CHLOROMAP_URL="${CHLOROMAP_URL}" \
        CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:${CLIENT_PORT}}" \
        NODE_ENV="${NODE_ENV}" \
        npm run dev:server

  wait_http "API server" "http://127.0.0.1:${SERVER_PORT}/api/v1/health" "${HEALTH_TIMEOUT_SEC}"
}

start_client() {
  if ! bool_true "${ENABLE_CLIENT:-true}"; then
    log "Client skipped (--no-client)"
    return 0
  fi

  start_bg client "${AGRISMART_ROOT}" \
    env VITE_API_URL="http://localhost:${SERVER_PORT}/api/v1" \
        npm run dev:client

  # Vite may take a moment; check root HTML
  wait_http "Vite client" "http://127.0.0.1:${CLIENT_PORT}/" "${HEALTH_TIMEOUT_SEC}"
}

# Resolve a Python interpreter capable of running Chloromap
resolve_ml_python() {
  local mode="${ML_PYTHON_MODE:-auto}"
  local venv_py="${CHLOROMAP_DIR}/.venv/bin/python"

  case "$mode" in
    venv)
      [[ -x "$venv_py" ]] || die "Chloromap venv not found at ${venv_py}"
      echo "$venv_py"
      return 0
      ;;
    uv)
      command_exists uv || die "'uv' not found"
      echo "uv"
      return 0
      ;;
    python)
      if command_exists python3.13; then echo "python3.13"; else echo "python3"; fi
      return 0
      ;;
    auto)
      if [[ -x "$venv_py" ]]; then
        echo "$venv_py"
      elif command_exists uv; then
        echo "uv"
      elif command_exists python3.13; then
        echo "python3.13"
      else
        echo "python3"
      fi
      return 0
      ;;
    *)
      die "Unknown ML_PYTHON_MODE=${mode}"
      ;;
  esac
}

start_ml() {
  if ! bool_true "${ENABLE_ML:-true}"; then
    log "Chloromap ML skipped (--no-ml)"
    return 0
  fi

  ensure_ml_deps

  if [[ ! -d "${CHLOROMAP_DIR}" ]]; then
    warn "Chloromap directory not found at ${CHLOROMAP_DIR} — skipping ML"
    return 0
  fi

  if [[ ! -f "${CHLOROMAP_CHECKPOINT}" ]]; then
    warn "Checkpoint missing: ${CHLOROMAP_CHECKPOINT} — skipping ML"
    warn "Place best_model.pth under chloromap/weights/ or set CHLOROMAP_CHECKPOINT"
    return 0
  fi

  local py runner
  py="$(resolve_ml_python)"
  log "Starting Chloromap ML with runner=${py}"

  local serve_script="${CHLOROMAP_DIR}/scripts/serve.py"
  [[ -f "$serve_script" ]] || die "Missing ${serve_script}"

  local lf
  lf="$(log_file ml)"

  if [[ "$py" == "uv" ]]; then
    start_bg ml "${CHLOROMAP_DIR}" \
      uv run python scripts/serve.py \
        --host "${ML_HOST}" \
        --port "${ML_PORT}" \
        --checkpoint "${CHLOROMAP_CHECKPOINT}"
  else
    start_bg ml "${CHLOROMAP_DIR}" \
      "$py" scripts/serve.py \
        --host "${ML_HOST}" \
        --port "${ML_PORT}" \
        --checkpoint "${CHLOROMAP_CHECKPOINT}"
  fi

  wait_http "Chloromap ML" "http://127.0.0.1:${ML_PORT}/health" "${HEALTH_TIMEOUT_SEC}"
}

stop_server()  { bool_true "${ENABLE_SERVER:-true}"  && stop_named server  || true; }
stop_client()  { bool_true "${ENABLE_CLIENT:-true}"  && stop_named client  || true; }
stop_ml()      { bool_true "${ENABLE_ML:-true}"      && stop_named ml      || true; }

print_status_line() {
  local name="$1"
  local pid
  pid="$(read_pid "$name")"
  if [[ "$pid" == docker:* ]]; then
    local container="${pid#docker:}"
    if docker ps --format '{{.Names}}' | grep -qx "$container"; then
      printf '  %-10s  running  (docker:%s)\n' "$name" "$container"
    else
      printf '  %-10s  stopped  (docker:%s)\n' "$name" "$container"
    fi
  elif is_pid_running "$pid"; then
    printf '  %-10s  running  (pid %s)\n' "$name" "$pid"
  else
    printf '  %-10s  stopped\n' "$name"
  fi
}

show_status() {
  echo ""
  echo "AgriSmart stack status"
  echo "----------------------"
  print_status_line mongodb
  print_status_line server
  print_status_line client
  print_status_line ml
  echo ""
  echo "Endpoints (when up):"
  echo "  Client   http://localhost:${CLIENT_PORT}"
  echo "  API      http://localhost:${SERVER_PORT}/api/v1/health"
  echo "  ML       http://localhost:${ML_PORT}/health"
  echo "  MongoDB  ${MONGODB_URI}"
  echo ""
}

print_banner() {
  cat <<EOF

  ╔══════════════════════════════════════════════════════════╗
  ║                   AgriSmart launcher                     ║
  ║   client · api · mongodb · chloromap ml                  ║
  ╚══════════════════════════════════════════════════════════╝

EOF
}
