import sys
from pathlib import Path

here = Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / 'audio'))
from scorekit import Score

s = Score(here, style='pulse', ending='button')
T0, T1, T2, T3, END = s.bars(2, 3, 2, 1.5)
s.arc(2, 3, 3, 3)

s.cue('pop', 0.05, deg=5)
s.cue('count', 0.2, dur=0.7, n=10)
s.cue('air', 1.0, d=0.7)
s.cue('snap', 1.5)
s.on_cuts('swipe')
s.cue('count', T1 + 0.85, dur=1.5, n=16)
s.cue('air', T2 + 0.8, d=1.4)
s.cue('pop', T2 + 2.15, deg=5, octave=6)
s.cue('snap', T2 + 2.3)
s.lift(T3)
s.cue('slide', T3 + 0.3, d=0.5)
s.cue('pop', T3 + 0.6, deg=3, octave=6)
s.cue('shimmer', T3 + 0.7)
s.cue('pop', T3 + 0.9, deg=1, octave=6)
s.cue('glitch', T3 + 1.1, d=0.9)
s.write()
