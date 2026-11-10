#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv run --no-project --python 3.12 --with kokoro-onnx==0.4.9 --with soundfile python -I audio/voices.py models "${@:-list}"
