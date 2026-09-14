#!/usr/bin/env bash
# =============================================================================
# AgriSmart — production-grade full-stack launcher (Linux / macOS / WSL)
# -----------------------------------------------------------------------------
# Starts (in order):
#   1. MongoDB          (reuse existing · local mongod · Docker)
#   2. API server       (Express / tsx watch on :5000)
#   3. Vite client      (:3000)
#   4. Chloromap ML     (FastAPI on :8000)  — optional sibling repo
#
# Usage:
#   ./launch.sh                  # start everything (foreground supervisor)
#   ./launch.sh up               # same as default
#   ./launch.sh up --no-ml       # skip Chloromap
#   ./launch.sh up --no-db       # assume MongoDB is already provisioned
#   ./launch.sh down             # stop managed processes
#   ./launch.sh status           # show PID / health snapshot
#   ./launch.sh logs [service]   # tail logs (server|client|ml|mongodb|all)
#   ./launch.sh restart          # down + up
#
# Configuration (priority high → low):
#   environment variables  >  scripts/launch/local.env  >  scripts/launch/defaults.env
#
# Examples:
#   ENABLE_ML=false ./launch.sh up
#   CHLOROMAP_DIR=/opt/chloromap ML_PORT=8080 ./launch.sh up
#   ./launch.sh up --detach      # start and exit (no Ctrl+C supervisor)
# =============================================================================

set -euo pipefail

AGRISMART_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AGRISMART_ROOT

LAUNCH_LIB="${AGRISMART_ROOT}/scripts/launch/bash"
# shellcheck source=/dev/null
source "${LAUNCH_LIB}/common.sh"
# shellcheck source=/dev/null
source "${LAUNCH_LIB}/mongodb.sh"
# shellcheck source=/dev/null
source "${LAUNCH_LIB}/services.sh"

# --- Load config -------------------------------------------------------------

load_env_file "${AGRISMART_ROOT}/scripts/launch/defaults.env"
load_env_file "${AGRISMART_ROOT}/scripts/launch/local.env"
# Project .env may contain secrets / Mongo URI — apply without clobbering
load_env_file "${AGRISMART_ROOT}/.env"
resolve_paths

# --- CLI ---------------------------------------------------------------------

COMMAND="up"
DETACH=false
SERVICES_FILTER=()

usage() {
  sed -n '2,35p' "$0" | sed 's/^# \?//'
  exit 0
}

parse_args() {
  local positional=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage ;;
      up|start|down|stop|status|logs|restart) COMMAND="$1"; shift ;;
      --detach|-d) DETACH=true; shift ;;
      --no-db)     ENABLE_DB=false; export ENABLE_DB; shift ;;
      --no-server) ENABLE_SERVER=false; export ENABLE_SERVER; shift ;;
      --no-client) ENABLE_CLIENT=false; export ENABLE_CLIENT; shift ;;
      --no-ml)     ENABLE_ML=false; export ENABLE_ML; shift ;;
      --force-install) FORCE_INSTALL=true; export FORCE_INSTALL; shift ;;
      --) shift; break ;;
      -*)
        die "Unknown option: $1 (try --help)"
        ;;
      *)
        positional+=("$1"); shift ;;
    esac
  done

  # `logs server` style
  if [[ "$COMMAND" == "logs" && ${#positional[@]} -gt 0 ]]; then
    SERVICES_FILTER=("${positional[@]}")
  elif [[ ${#positional[@]} -gt 0 && "$COMMAND" == "up" ]]; then
    # allow `./launch.sh logs all` when logs was set via positional first token
    case "${positional[0]}" in
      up|start|down|stop|status|logs|restart)
        COMMAND="${positional[0]}"
        SERVICES_FILTER=("${positional[@]:1}")
        ;;
    esac
  fi
}

# --- Lifecycle ---------------------------------------------------------------

cleanup_on_exit() {
  local code=$?
  if [[ "${AGRISMART_SUPERVISOR:-false}" == "true" ]]; then
    echo ""
    log "Shutting down AgriSmart stack (exit ${code})..."
    stop_client || true
    stop_server || true
    stop_ml || true
    # Only stop Mongo if we started it in this session
    if [[ "${AGRISMART_MONGO_MANAGED:-false}" == "true" || "${AGRISMART_MONGO_MANAGED:-}" == "docker" ]]; then
      stop_mongodb || true
    else
      log "Leaving pre-existing MongoDB running"
    fi
    ok "Stack stopped"
  fi
}

start_stack() {
  print_banner
  log "Root: ${AGRISMART_ROOT}"
  log "Chloromap: ${CHLOROMAP_DIR}"
  log "Logs: ${LOG_DIR}"

  ensure_node_deps
  ensure_dotenv

  start_mongodb
  start_server
  start_client
  start_ml

  show_status

  cat <<EOF
Ready.
  Open the app:     http://localhost:${CLIENT_PORT}
  API health:       http://localhost:${SERVER_PORT}/api/v1/health
  Chloromap health: http://localhost:${ML_PORT}/health

EOF

  if bool_true "$DETACH"; then
    ok "Detached mode — processes keep running. Use ./launch.sh down to stop."
    return 0
  fi

  export AGRISMART_SUPERVISOR=true
  trap cleanup_on_exit EXIT INT TERM

  log "Supervisor running — press Ctrl+C to stop all managed services."
  # Watch child PIDs; exit if a critical service dies unexpectedly
  while true; do
    sleep 2
    if bool_true "${ENABLE_SERVER:-true}"; then
      local spid
      spid="$(read_pid server)"
      if ! is_pid_running "$spid"; then
        err "API server exited unexpectedly — check $(log_file server)"
        exit 1
      fi
    fi
    if bool_true "${ENABLE_CLIENT:-true}"; then
      local cpid
      cpid="$(read_pid client)"
      if ! is_pid_running "$cpid"; then
        err "Vite client exited unexpectedly — check $(log_file client)"
        exit 1
      fi
    fi
  done
}

stop_stack() {
  log "Stopping AgriSmart stack..."
  stop_client || true
  stop_server || true
  stop_ml || true
  stop_mongodb || true
  show_status
}

tail_logs() {
  local target="${SERVICES_FILTER[0]:-all}"
  local files=()
  case "$target" in
    all)
      files=("${LOG_DIR}"/*.log)
      ;;
    server|client|ml|mongodb)
      files=("$(log_file "$target")")
      ;;
    *)
      die "Unknown log target '${target}'. Use: server|client|ml|mongodb|all"
      ;;
  esac

  # shellcheck disable=SC2068
  if ! ls ${files[@]} >/dev/null 2>&1; then
    die "No log files found yet under ${LOG_DIR}"
  fi
  log "Tailing: ${files[*]}"
  tail -n 100 -F "${files[@]}"
}

# --- Main --------------------------------------------------------------------

parse_args "$@"

case "$COMMAND" in
  up|start)   start_stack ;;
  down|stop)  stop_stack ;;
  restart)    stop_stack; DETACH=true; start_stack ;;
  status)     show_status ;;
  logs)       tail_logs ;;
  *)          die "Unknown command: ${COMMAND}" ;;
esac
