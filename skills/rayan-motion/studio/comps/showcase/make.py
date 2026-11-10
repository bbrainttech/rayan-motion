import sys
from pathlib import Path

here = Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / 'audio'))
from scorekit import Score

s = Score(here, style='lofi', ending='fade')
T0, T1, T2, END = s.bars(1, 1, 1.5)
s.arc(1, 2, 2)

s.cue('air', 0.3, d=1.1)
s.on_cuts('swipe', gain=0.07)
s.cue('pop', T1 + 1.0, deg=3)
s.cue('tap', T1 + 1.3)
s.cue('pop', T1 + 1.5, deg=5)
s.cue('tap', T1 + 1.8)
s.cue('slide', T2 + 0.2, d=0.8)
s.cue('ding', T2 + 1.2, deg=5)
s.write()
