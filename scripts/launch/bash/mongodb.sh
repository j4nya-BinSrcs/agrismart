# =============================================================================
# MongoDB lifecycle helpers
# =============================================================================

# shellcheck shell=bash

mongo_already_reachable() {
  wait_tcp "MongoDB" "${MONGO_BIND:-127.0.0.1}" "${MONGO_PORT:-27017}" 2 >/dev/null 2>&1
}

# Returns 0 if something is already listening on the Mongo port.
mongo_port_open() {
  local host="${MONGO_BIND:-127.0.0.1}"
  local port="${MONGO_PORT:-27017}"
  if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
    return 0
  fi
  if command_exists nc && nc -z "$host" "$port" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

start_mongodb() {
  if ! bool_true "${ENABLE_DB:-true}"; then
    log "MongoDB skipped (--no-db / ENABLE_DB=false)"
    return 0
  fi

  if mongo_port_open; then
    ok "MongoDB already running on ${MONGO_BIND}:${MONGO_PORT} — reusing"
    export AGRISMART_MONGO_MANAGED=false
    return 0
  fi

  # Prefer Docker if mongod binary is missing
  if ! command_exists mongod; then
    if command_exists docker; then
      log "mongod not found — starting MongoDB via Docker..."
      local container="agrismart-mongo"
      if docker ps -a --format '{{.Names}}' | grep -qx "$container"; then
        docker start "$container" >/dev/null
      else
        docker run -d --name "$container" \
          -p "${MONGO_PORT}:27017" \
          -v "${MONGO_DATA_DIR}:/data/db" \
          mongo:7 >/dev/null
      fi
      write_pid "mongodb" "docker:${container}"
      export AGRISMART_MONGO_MANAGED=docker
      wait_tcp "MongoDB" "127.0.0.1" "${MONGO_PORT}" "${HEALTH_TIMEOUT_SEC}"
      return $?
    fi
    die "Neither 'mongod' nor 'docker' is available. Install MongoDB or Docker, or pass --no-db."
  fi

  mkdir -p "${MONGO_DATA_DIR}"
  local lf
  lf="$(log_file mongodb)"

  log "Starting local mongod (dbpath=${MONGO_DATA_DIR})..."
  # Forked mongod writes its own pid; we also track it for stop.
  if mongod \
    --dbpath "${MONGO_DATA_DIR}" \
    --bind_ip "${MONGO_BIND}" \
    --port "${MONGO_PORT}" \
    --fork \
    --logpath "${lf}" >/dev/null 2>&1; then
    # Discover child pid from port
    local pid=""
    if command_exists lsof; then
      pid="$(lsof -tiTCP:"${MONGO_PORT}" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
    elif command_exists fuser; then
      pid="$(fuser "${MONGO_PORT}/tcp" 2>/dev/null | awk '{print $1}' || true)"
    fi
    if [[ -n "$pid" ]]; then
      write_pid "mongodb" "$pid"
    else
      write_pid "mongodb" "forked"
    fi
    export AGRISMART_MONGO_MANAGED=true
    wait_tcp "MongoDB" "${MONGO_BIND}" "${MONGO_PORT}" "${HEALTH_TIMEOUT_SEC}"
    return $?
  fi

  die "Failed to start mongod. Check ${lf}"
}

stop_mongodb() {
  if ! bool_true "${ENABLE_DB:-true}"; then
    return 0
  fi

  local pid
  pid="$(read_pid mongodb)"

  if [[ "$pid" == docker:* ]]; then
    local container="${pid#docker:}"
    log "Stopping Docker MongoDB container ${container}..."
    docker stop "$container" >/dev/null 2>&1 || true
    clear_pid mongodb
    ok "Stopped MongoDB (docker)"
    return 0
  fi

  if [[ "$pid" == "forked" ]] || ! is_pid_running "$pid"; then
    # Try graceful shutdown via mongosh if we own the data dir
    if command_exists mongosh && mongo_port_open; then
      # Only shut down if this looks like our managed instance
      if [[ -d "${MONGO_DATA_DIR}" ]]; then
        log "Sending db.shutdownServer() to local MongoDB..."
        mongosh --quiet --port "${MONGO_PORT}" --eval 'db.adminCommand({ shutdown: 1 })' >/dev/null 2>&1 || true
      fi
    elif is_pid_running "$pid"; then
      kill "$pid" 2>/dev/null || true
    fi
    clear_pid mongodb
    ok "Stopped MongoDB"
    return 0
  fi

  stop_named mongodb
}
