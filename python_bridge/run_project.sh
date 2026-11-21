#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
  PYTHON="$SCRIPT_DIR/.venv/bin/python"
elif [[ -x "$SCRIPT_DIR/venv/bin/python" ]]; then
  PYTHON="$SCRIPT_DIR/venv/bin/python"
else
  printf 'Python virtual environment not found.\n' >&2
  printf 'Create it with: python3 -m venv "%s/.venv"\n' "$SCRIPT_DIR" >&2
  printf 'Then install dependencies with: "%s/.venv/bin/python" -m pip install -r "%s/requirements.txt"\n' "$SCRIPT_DIR" "$SCRIPT_DIR" >&2
  exit 1
fi

while true; do
  printf '\nSign Language Translator\n'
  printf '1. Collect training data\n'
  printf '2. Train model\n'
  printf '3. Run real-time detection\n'
  printf '4. Exit\n'
  read -r -p 'Choose an option (1-4): ' choice

  case "$choice" in
    1) "$PYTHON" "$SCRIPT_DIR/collect_data.py" ;;
    2) "$PYTHON" "$SCRIPT_DIR/train_model.py" ;;
    3) "$PYTHON" "$SCRIPT_DIR/realtime_detect.py" ;;
    4) exit 0 ;;
    *) printf 'Invalid option. Enter a number from 1 to 4.\n' ;;
  esac
done
