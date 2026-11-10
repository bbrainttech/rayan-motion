import json
import sys

voice_path, out_path = sys.argv[1], sys.argv[2]
voice = json.load(open(voice_path))


def stamp(t):
    m, s = divmod(max(0.0, t), 60)
    h, m = divmod(int(m), 60)
    return f"{h:02d}:{m:02d}:{s:06.3f}"


cues = ['WEBVTT', '']
for i, v in enumerate(voice):
    end = v['end'] + 0.4
    if i + 1 < len(voice):
        end = min(end, voice[i + 1]['at'] - 0.05)
    cues += [str(i + 1), f"{stamp(v['at'])} --> {stamp(end)}", v['text'], '']
open(out_path, 'w').write('\n'.join(cues))
print(f"{len(voice)} captions in {out_path}")
