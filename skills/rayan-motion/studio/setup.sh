#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

missing=0
for tool in bun ffmpeg ffprobe uv python3 curl; do
  if command -v "$tool" >/dev/null; then echo "ok       $tool"; else echo "MISSING  $tool"; missing=1; fi
done
[ "$missing" = 0 ] || { echo "Install the missing tools, then run this again."; exit 1; }

(cd render && bun install)
bun -e "import('./render/chrome.ts').then((m) => console.log('ok       chrome at', m.chrome()))"

BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  if [ -s "models/$f" ]; then echo "ok       models/$f"; else echo "fetching models/$f"; curl -L --fail -o "models/$f" "$BASE/$f"; fi
done
echo "The speech check downloads its Whisper model (about 150 MB) into models/whisper the first time it runs."
df -h . | tail -1
