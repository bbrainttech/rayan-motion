import sys
from pathlib import Path

here = Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / 'audio'))
from scorekit import Score

ENDING = sys.argv[1] if len(sys.argv) > 1 else 'cta'
MUSIC = {'cta': 'button', 'logo': 'ring', 'result': 'ring', 'loop': 'loop'}
if ENDING not in MUSIC:
    raise SystemExit(f'ending is one of {", ".join(MUSIC)}')

s = Score(here, style='glass', ending=MUSIC[ENDING])
T0, T1, T2, T3, END = s.bars(*((2, 4, 1, 1) if ENDING == 'loop' else (2, 4, 2, 2)))
B = s.beat
PRESS, ADD, BUTTON = T1 + 4.5 * B, T1 + 12 * B, T3 + 4 * B
TYPE = PRESS + 0.75

s.line(0, 'Capture a task before it slips away.')
s.line(1, 'Press New task.', after=0.45)
s.line(1, 'Type what needs doing, then press Add.', after=3.1)
s.line(2, 'It lands at the top of your list.')
spoken = {'cta': 'Plan your week in Acme.', 'result': "Now it's on your list for today."}
if ENDING in spoken:
    s.line(3, spoken[ENDING])

s.arc(0, 2, 3, {'cta': 2, 'logo': 1, 'result': 1, 'loop': 0}[ENDING])

s.cue('pop', 0.3, deg=5)
s.cue('shimmer', 1.0)
s.on_cuts('swipe')
s.cue('slide', T1 + 0.15, d=0.9)
s.cue('tap', PRESS)
s.cue('pop', PRESS + 0.06, deg=3, octave=6)
s.cue('keys', TYPE, dur=1.6, n=21)
s.cue('tap', ADD)
s.cue('ding', ADD + 0.12, deg=5)
s.cue('air', T2 + 0.05, d=0.8)
s.cue('shimmer', T2 + 1.0)
s.cue('pop', T2 + 1.3, deg=1, octave=6)

if ENDING == 'cta':
    s.cue('snap', T3 + 0.45)
    s.cue('snap', T3 + 0.59)
    s.cue('shimmer', T3 + 0.85)
    s.cue('slide', T3 + 1.25, d=0.6)
    s.cue('tap', BUTTON)
    s.button(BUTTON)
elif ENDING == 'logo':
    s.lift(T3 + 0.25)
    s.cue('shimmer', T3 + 0.95)
elif ENDING == 'result':
    s.cue('air', T3 + 0.2, d=0.9)
    for i, deg in enumerate((1, 3, 5)):
        s.cue('pop', T3 + 1.2 + 0.09 * i, deg=deg)
else:
    s.cue('air', T3 + 0.2, d=0.9)
    s.cue('shimmer', END - 1.3)

s.page(ENDING=ENDING, BPM=s.bpm)
s.write()
