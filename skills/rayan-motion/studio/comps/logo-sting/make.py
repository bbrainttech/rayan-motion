import sys
from pathlib import Path

here = Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / 'audio'))
from scorekit import Score

HIT = 1.6

s = Score(here, style='air', ending='ring')
s.seconds(4.8)
s.energy(0, 1)
s.cue('air', 0.3, d=0.9)
s.lift(HIT, d=1.2)
s.cue('ding', HIT + 0.05, deg=1, octave=6)
s.cue('shimmer', HIT + 0.35)
s.write()
