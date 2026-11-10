import json
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from dsp import SR, add, convolve, follower, hp, limit, lufs, rms_db, room
from music import render
from sounds import MUSIC_BUS, Key, make
from styles import GAIN, REVERB, STYLES

vo_dir, lines_path, score_path, out_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
spec = json.load(open(score_path))
music_spec = dict(spec.get('music') or {})
style = music_spec.get('style', 'glass')
ending = music_spec.get('ending', 'ring')
seed = int(music_spec.get('seed', 11))
DUR = float(spec['duration'])
N = int(round(SR * DUR))
n = N + (int(4 * SR) if ending == 'loop' else 0)
lines = json.load(open(lines_path))
voiced = bool(lines)


def stereo(x):
    return np.repeat(x[:, None], 2, axis=1) if x.ndim == 1 else x[:, :2]


if music_spec.get('track'):
    bed, rate = sf.read(str(Path(score_path).parent / music_spec['track']), always_2d=True)
    bed = stereo(resample_poly(bed, SR, rate, axis=0) if rate != SR else bed)
    if music_spec.get('repeat', True):
        music = np.tile(bed, (int(np.ceil(n / len(bed))), 1))[:n]
    else:
        music = np.concatenate([bed, np.zeros((max(0, n - len(bed)), 2))])[:n]
    send = music * 0.0
    style = 'none'
else:
    music, send, song = render(music_spec, n, DUR, spec.get('cuts', []))

info = STYLES[style]
key = Key(music_spec.get('key') or info['key'], music_spec.get('minor', info['minor']))

level = rms_db(music[:N])
if level > -100:
    target = (-25.0 if voiced else -17.0) + float(music_spec.get('gain_db', 0.0))
    g = 10 ** ((target - level) / 20)
    music, send = music * g, send * g

sfx, fx_music, fx_send = np.zeros((n, 2)), np.zeros((n, 2)), np.zeros((n, 2))
for cue in spec.get('sfx', []):
    name = cue['fx']
    rng = np.random.default_rng([seed, zlib.crc32(name.encode()), int(round(cue['at'] * 1000))])
    x = make(name, rng, cue, key)
    gain = cue.get('gain', GAIN[name])
    add(fx_music if name in MUSIC_BUS else sfx, x, cue['at'], gain, cue.get('pan', 0.0))
    add(fx_send, x, cue['at'], gain * REVERB.get(name, 0.1), cue.get('pan', 0.0))

vo = np.zeros((n, 2))
placed = []
for i, ln in enumerate(lines):
    x, sr = sf.read(f"{vo_dir}/vo_{i:02d}.wav")
    if x.ndim > 1:
        x = x.mean(axis=1)
    x = hp(resample_poly(x, SR, sr) if sr != SR else x, 85)
    x = x / (np.abs(x).max() + 1e-9) * 0.7
    nz = np.flatnonzero(np.abs(x) > 0.02)
    lead = nz[0] / SR if len(nz) else 0.0
    tail = nz[-1] / SR if len(nz) else 0.0
    add(vo, x, ln['at'] - lead, 1.0, ln.get('pan', 0.0))
    placed.append((ln['at'], ln['at'] - lead + len(x) / SR, ln['at'] - lead + tail, ln['text']))

if voiced:
    env = follower(np.abs(vo).max(axis=1), 0.004, 0.12)
    vo = vo * (np.maximum(env / 0.12, 1) ** (1 / 2.6 - 1) * 1.9)[:, None]
    d = follower(np.minimum(1, np.abs(vo).max(axis=1) / 0.08), 0.03, 0.35)
    duck = (1 - 0.45 * d)[:, None]
else:
    duck = np.ones((n, 1))

r = info['room']
ir = room(np.random.default_rng(seed + 7), r['seconds'], r['tau'], r['bright'])
wet = convolve(send + fx_send + vo * 0.06, ir, n) * r['wet']
bed = (music + fx_music) * duck + wet * np.sqrt(duck)

if ending == 'fade' and (style != 'none' or music_spec.get('track')):
    beat = 60 / float(music_spec.get('bpm') or info['bpm'])
    k = int(min(8 * beat, 4.0, DUR * 0.4) * SR)
    bed[N - k:N] *= (np.cos(np.linspace(0, np.pi / 2, k)) ** 2)[:, None]
    bed[N:] = 0

mix = bed + sfx + vo
if ending == 'loop':
    extra = mix[N:]
    mix = mix[:N].copy()
    mix[: len(extra)] += extra[:N]
else:
    mix = mix[:N]
    k = min(N, int(0.3 * SR))
    mix[N - k:] *= (np.linspace(1, 0, k) ** 2)[:, None]
    a = min(N, int(0.01 * SR))
    mix[:a] *= np.linspace(0, 1, a)[:, None]
mix = hp(mix, 25)

loud = spec.get('loudness', True) is not False
if loud:
    mix = mix * 10 ** ((-14.0 - lufs(mix)) / 20)
    mix = limit(mix, 10 ** (-2.6 / 20))
    mix = mix * 10 ** ((-14.0 - lufs(mix)) / 20)
mix = limit(mix, 10 ** (-2.6 / 20))
if not loud:
    mix = mix * (10 ** (-3.0 / 20) / max(np.abs(mix).max(), 1e-9))

sf.write(f"{out_dir}/mix.wav", mix.astype(np.float32), SR, subtype='FLOAT')
sf.write(f"{out_dir}/stem_vo.wav", vo[:N].astype(np.float32), SR, subtype='FLOAT')
sf.write(f"{out_dir}/stem_music.wav", bed[:N].astype(np.float32), SR, subtype='FLOAT')
sf.write(f"{out_dir}/stem_sfx.wav", sfx[:N].astype(np.float32), SR, subtype='FLOAT')

voice, overlaps = [], 0
for i, (a, b, e, txt) in enumerate(placed):
    nxt = placed[i + 1][0] if i + 1 < len(placed) else DUR
    flag = '  OVERLAP' if b > nxt - 0.08 else ''
    overlaps += bool(flag)
    print(f"{a:6.2f} → {b:6.2f}  next {nxt:6.2f}  {txt}{flag}")
    voice.append({'at': a, 'end': round(e, 3), 'text': txt})
json.dump(voice, open(f"{out_dir}/voice.json", 'w'), indent=1, ensure_ascii=False)
print(f"style {style}  ending {ending}  mix {lufs(mix):.1f} LUFS  peak {20 * np.log10(np.abs(mix).max() + 1e-12):.1f} dBFS  overlaps {overlaps}")
