import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

models, command, *rest = sys.argv[1:]
k = Kokoro(f"{models}/kokoro-v1.0.onnx", f"{models}/voices-v1.0.bin")
names = sorted(k.get_voices())
KINDS = {'a': 'American English', 'b': 'British English', 'e': 'Spanish', 'f': 'French', 'h': 'Hindi', 'i': 'Italian', 'j': 'Japanese', 'p': 'Portuguese', 'z': 'Chinese'}
LANGS = {'a': 'en-us', 'b': 'en-gb', 'e': 'es', 'f': 'fr-fr', 'h': 'hi', 'i': 'it', 'j': 'ja', 'p': 'pt-br', 'z': 'cmn'}

if command == 'list':
    for prefix, label in KINDS.items():
        for sex, word in (('f', 'female'), ('m', 'male')):
            found = [n for n in names if n.startswith(prefix + sex + '_')]
            if found:
                print(f"{label}, {word} (lang {LANGS[prefix]}): {', '.join(found)}")
elif command == 'audition':
    text = rest[0] if rest else 'Capture a task before it slips away. Press New task, type what needs doing, then press Add.'
    picked = rest[1:] or [n for n in ('af_bella', 'af_heart', 'af_nova', 'am_michael', 'am_fenrir', 'bf_emma', 'bm_george') if n in names]
    out = Path(models).parent / 'auditions'
    out.mkdir(exist_ok=True)
    for name in picked:
        if '+' not in name and name not in names:
            print(f"no voice named {name}; run list")
            continue
        voice = name
        if '+' in name:
            voice = sum(k.get_voice_style(n) * float(w) for n, w in (p.split(':') for p in name.split('+')))
        samples, sr = k.create(text, voice=voice, speed=1.0, lang=LANGS.get(name[0], 'en-us'))
        path = out / f"{name.replace('+', '_').replace(':', '-')}.wav"
        sf.write(str(path), np.asarray(samples, dtype=np.float32), sr)
        print(f"{path}  {len(samples) / sr:.1f}s")
else:
    print('usage: bash audio/voices.sh list | audition ["text" [voice ...]]')
