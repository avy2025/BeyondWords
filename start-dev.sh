#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()
NAMES=()

cleanup() {
  if [[ -n "${PIDS[*]-}" ]]; then
    for pid in "${PIDS[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
    for pid in "${PIDS[@]}"; do
      wait "$pid" 2>/dev/null || true
    done
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Error: %s is required. Install Node.js and npm, then try again.\n' "$command" >&2
    exit 1
  fi
done

for directory in "$ROOT/server" "$ROOT/client"; do
  if [[ ! -d "$directory/node_modules" ]]; then
    printf 'Error: dependencies are missing in %s. Run "npm install" there first.\n' "$directory" >&2
    exit 1
  fi
done

start_service() {
  local name="$1"
  local directory="$2"
  shift 2

  (cd "$directory" && exec "$@") &
  PIDS+=("$!")
  NAMES+=("$name")
  printf 'Started %s (pid %s)\n' "$name" "${PIDS[${#PIDS[@]}-1]}"
}

printf '%s\n' '--- BeyondWords development services ---'
start_service "Node API (:5000)" "$ROOT/server" npm run dev
start_service "Vite client (:5173)" "$ROOT/client" npm run dev

BRIDGE_DIR="$ROOT/python_bridge"
if [[ -f "$BRIDGE_DIR/sign_model.pth" && -f "$BRIDGE_DIR/labels.pkl" ]]; then
  if [[ -x "$BRIDGE_DIR/.venv/bin/python" ]]; then
    PYTHON="$BRIDGE_DIR/.venv/bin/python"
  elif [[ -x "$BRIDGE_DIR/venv/bin/python" ]]; then
    PYTHON="$BRIDGE_DIR/venv/bin/python"
  else
    printf 'Warning: sign-language model found, but no Python virtual environment. Set it up as described in README.md.\n' >&2
    PYTHON=""
  fi

  if [[ -n "$PYTHON" ]]; then
    start_service "Python sign-language bridge (:8765)" "$BRIDGE_DIR" "$PYTHON" sign_ws_server.py
  fi
else
  printf 'Sign-language bridge not started: train a model first to create sign_model.pth and labels.pkl.\n'
fi

printf '\nOpen http://localhost:5173 (press Ctrl+C to stop all started services).\n'

while true; do
  for index in "${!PIDS[@]}"; do
    pid="${PIDS[$index]}"
    if ! jobs -pr | grep -Fxq "$pid"; then
      set +e
      wait "$pid"
      status=$?
      set -e
      printf 'Error: %s stopped unexpectedly (exit code %s).\n' "${NAMES[$index]}" "$status" >&2
      exit 1
    fi
  done
  sleep 1
done
