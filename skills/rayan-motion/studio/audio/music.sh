#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ENDING="${ENDING:-ring}"
STYLES=("$@")
[ ${#STYLES[@]} -gt 0 ] || STYLES=(glass pulse lofi air)
mkdir -p auditions
for STYLE in "${STYLES[@]}"; do
  D="$(mktemp -d)"
  mkdir -p "$D/vo"
  python3 - "$D" "$STYLE" "$ENDING" <<'PY'
import sys
sys.path.insert(0, 'audio')
from scorekit import Score
s = Score(sys.argv[1], style=sys.argv[2], ending=sys.argv[3])
s.bars(2, 2, 2, 2)
s.arc(0, 1, 2, 3)
s.write()
PY
  uv run --no-project --python 3.12 --with soundfile --with scipy python -I audio/mix.py "$D/vo" "$D/lines.json" "$D/score.json" "$D" | tail -1
  cp "$D/mix.wav" "auditions/music-$STYLE-$ENDING.wav"
  echo "auditions/music-$STYLE-$ENDING.wav"
  rm -rf "$D"
done
