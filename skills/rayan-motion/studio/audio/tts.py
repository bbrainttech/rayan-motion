import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

models, lines_path, out_dir, voice = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
lang = sys.argv[6] if len(sys.argv) > 6 else 'en-us'
lines = json.load(open(lines_path))
here = Path(lines_path).parent
engine = None


def kokoro():
    global engine
    if engine is None:
        from kokoro_onnx import Kokoro
        engine = Kokoro(f"{models}/kokoro-v1.0.onnx", f"{models}/voices-v1.0.bin")
    return engine


def style(name):
    if '+' not in name:
        return name
    return sum(kokoro().get_voice_style(n) * float(w) for n, w in (p.split(':') for p in name.split('+')))


for i, ln in enumerate(lines):
    out = f"{out_dir}/vo_{i:02d}.wav"
    if 'file' in ln:
        samples, sr = sf.read(str(here / ln['file']), dtype='float32')
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        sf.write(out, samples, sr)
        print(f"{i:02d} {len(samples) / sr:5.2f}s  {ln['text']}  (recorded: {ln['file']})")
        continue
    k = kokoro()
    v, lg, sp = ln.get('voice', voice), ln.get('lang', lang), ln.get('speed', speed)
    if 'ipa' in ln:
        samples, sr = k.create(ln['ipa'], voice=style(v), speed=sp, lang=lg, is_phonemes=True)
    else:
        samples, sr = k.create(ln['text'], voice=style(v), speed=sp, lang=lg)
    samples = np.asarray(samples, dtype=np.float32)
    sf.write(out, samples, sr)
    print(f"{i:02d} {len(samples) / sr:5.2f}s  {v}  {ln['text']}  /{k.tokenizer.phonemize(ln['text'], lg)}/")
