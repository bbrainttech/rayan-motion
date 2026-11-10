#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
ID="${1:?usage: bash audio/build.sh <id>}"
V="comps/$ID"
B="$V/build"
PY=(uv run --no-project --python 3.12 --with kokoro-onnx==0.4.9 --with soundfile --with scipy python -I)
[ -f "$V/score.json" ] || { echo "no $V/score.json: run python3 $V/make.py" >&2; exit 1; }

setting() { python3 -c 'import json, sys; s = json.load(open(sys.argv[1])); g = json.load(open("studio.json")); print(s.get(sys.argv[2], g.get(sys.argv[2], sys.argv[3])))' "$V/score.json" "$1" "$2"; }
VOICE="${VOICE:-$(setting voice af_bella)}"
LANG_CODE="$(setting lang en-us)"
SPEED="$(setting speed 1.0)"
FROM="$(setting voice_from '')"

rm -rf "$B/vo-raw" "$B/vo"
mkdir -p "$B/vo"
if [ -n "$FROM" ]; then
  cmp -s "$V/lines.json" "comps/$FROM/lines.json" || { echo "lines.json differs from comps/$FROM/lines.json" >&2; exit 1; }
  cp -R "comps/$FROM/build/vo-raw" "$B/vo-raw"
  echo "voice from comps/$FROM"
else
  mkdir -p "$B/vo-raw"
  "${PY[@]}" audio/tts.py models "$V/lines.json" "$B/vo-raw" "$VOICE" "$SPEED" "$LANG_CODE"
fi

for f in "$B"/vo-raw/vo_*.wav; do
  [ -e "$f" ] || continue
  ffmpeg -nostdin -v error -y -i "$f" -af "deesser=i=0.6:m=0.5:f=0.5:s=o,treble=g=-1.5:f=9000" "$B/vo/$(basename "$f")"
done

"${PY[@]}" audio/mix.py "$B/vo" "$V/lines.json" "$V/score.json" "$B"
python3 audio/captions.py "$B/voice.json" "$V/$ID.vtt"

M=$(ffmpeg -nostdin -nostats -i "$B/mix.wav" -af loudnorm=I=-14:TP=-2.2:LRA=20:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }
if [ "$(setting loudness True)" = "False" ]; then
  GAIN=$(python3 -c "import sys; print(round(-3.0 - float(sys.argv[1]), 2))" "$(get input_tp)")
  ffmpeg -nostdin -v error -y -i "$B/mix.wav" -af "volume=${GAIN}dB,aresample=48000" -c:a pcm_s24le "$V/$ID-audio.wav"
else
  ffmpeg -nostdin -v error -y -i "$B/mix.wav" \
    -af "loudnorm=I=-14:TP=-2.2:LRA=20:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
    -c:a pcm_s24le "$V/$ID-audio.wav"
fi

DUR=$(python3 -c "import json, sys; print(json.load(open(sys.argv[1]))['duration'])" "$V/score.json")
MUXED=0
for SILENT in "$B"/video-silent*.mp4; do
  [ -e "$SILENT" ] || continue
  NAME="$(basename "$SILENT" .mp4)"
  OUT="$V/$ID${NAME#video-silent}.mp4"
  ffmpeg -nostdin -v error -y -i "$SILENT" -i "$V/$ID-audio.wav" -map 0:v -map 1:a \
    -c:v copy -c:a aac -b:a 256k -ar 48000 -t "$DUR" -movflags +faststart "$OUT"
  echo "$OUT"
  ffmpeg -nostdin -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)"
  MUXED=1
done
[ "$MUXED" = 1 ] || echo "no $B/video-silent.mp4 yet: render it, then run this again to mux"
