import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import soundfile as sf
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

root = Path(__file__).resolve().parent.parent
vid = sys.argv[1]
variant = sys.argv[2] if len(sys.argv) > 2 else ''
v = root / 'comps' / vid
mp4, wav = v / f"{vid}{'-' + variant if variant else ''}.mp4", v / f'{vid}-audio.wav'
spec = json.load(open(v / 'score.json'))
studio = json.load(open(root / 'studio.json'))
shortest, longest = spec.get('length') or studio.get('length', [20, 60])
fps = spec.get('fps') or studio.get('fps', 60)
lang = spec.get('lang') or studio.get('lang', 'en-us')
failed = []


def check(name, ok, detail):
    print(f"{'PASS' if ok else 'FAIL'}  {name:<11} {detail}")
    if not ok:
        failed.append(name)


probe = json.loads(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', str(mp4)],
    capture_output=True, text=True, check=True).stdout)
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
formats = json.load(open(root / 'presets.json'))
want = spec.get('size', (1920, 1080))
if variant:
    want = formats[variant]['size'] if variant in formats else [int(n) for n in variant.split('x')]
check('picture', (video['width'], video['height'], video['r_frame_rate']) == (*want, f'{fps}/1'), f"{video['width']}×{video['height']} at {video['r_frame_rate']} fps")
length = float(probe['format']['duration'])
check('length', shortest <= length <= longest and abs(length - spec['duration']) < 0.05, f"{length:.2f} s, scenes {spec['duration']} s")

meter = subprocess.run(['ffmpeg', '-nostats', '-i', str(mp4), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summary = meter[meter.rindex('Summary:'):]
lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary).group(1))
peak = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summary).group(1))
if spec.get('loudness', True):
    check('loudness', abs(lufs + 14) <= 0.5, f"{lufs} LUFS integrated")
else:
    print(f"SKIP  loudness    {lufs} LUFS integrated (too sparse to target; peak still checked)")
check('true peak', peak <= -1.5, f"{peak} dBTP")

lines = json.load(open(v / 'lines.json'))
if not lines:
    print('SKIP  transcript  no voice lines')
    sys.exit(1 if failed else 0)
english = lang.startswith('en')
kept = root / 'models' / 'whisper'
model = WhisperModel('base.en' if english else 'base', device='cpu', compute_type='int8', download_root=str(kept), local_files_only=english and kept.exists() and any(kept.iterdir()))
pcm, rate = sf.read(str(wav), dtype='float32')
pcm = resample_poly(pcm.mean(axis=1) if pcm.ndim > 1 else pcm, 16000, rate).astype('float32')
segments, _ = model.transcribe(pcm, language=lang[:2], beam_size=5, vad_filter=False, hotwords=studio.get('hotwords') or None)
heard = ' '.join(s.text.strip() for s in segments)


def words(text):
    return re.sub(r"[^\w' ]+", ' ', text.lower().replace('-', ' ')).split()


said, script = words(heard), words(' '.join(ln['text'] for ln in lines))
print('heard: ', heard)
diff = [op for op in SequenceMatcher(a=script, b=said, autojunk=False).get_opcodes() if op[0] != 'equal']
detail = 'word for word' if not diff else '; '.join(f"script '{' '.join(script[a:b])}' heard '{' '.join(said[c:d])}'" for _, a, b, c, d in diff)
check('transcript', not diff, detail)
sys.exit(1 if failed else 0)
