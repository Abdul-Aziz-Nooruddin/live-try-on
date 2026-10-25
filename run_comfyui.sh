#!/usr/bin/env bash
# Script to launch ComfyUI with Lucy Edit custom nodes
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMFY_DIR="$PROJECT_ROOT/ComfyUI"

echo "=== Starting ComfyUI with Lucy Edit Nodes ==="
echo "Working directory: $COMFY_DIR"

source "$COMFY_DIR/.venv/bin/activate"

# Launch ComfyUI on default port 8188
exec python "$COMFY_DIR/main.py" --listen 127.0.0.1 --port 8188 "$@"
