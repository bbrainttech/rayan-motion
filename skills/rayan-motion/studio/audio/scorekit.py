import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from styles import ENDINGS, SOUNDS, STYLES

STUDIO = json.loads((HERE.parent / 'studio.json').read_text())
PARAMS = {
    'keys': {'dur', 'n'}, 'count': {'dur', 'n'}, 'swipe': {'d', 'dir'}, 'air': {'d'}, 'slide': {'d'}, 'glitch': {'d'},
    'ding': {'deg', 'octave', 'note'}, 'pop': {'deg', 'octave', 'note'}, 'shimmer': {'octave'}, 'rise': {'d'}, 'drop': {'d'},
    'tap': {'tone'}, 'latch': set(), 'snap': set(),
}


class Score:
    def __init__(self, here, *, style=None, ending=None, bpm=None, key=None, minor=None, seed=None, track=None, repeat=None,
                 music_db=None, voice=None, lang=None, speed=None, voice_from=None, lead=0.3, fps=None, size=None, length=None, loudness=None):
        m = STUDIO.get('music', {})
        self.here = Path(here)
        self.style = style or m.get('style', 'glass')
        if self.style not in STYLES:
            raise SystemExit(f'unknown style {self.style!r}; pick one of {", ".join(STYLES)}')
        self.ending = ending or m.get('ending', 'ring')
        if self.ending not in ENDINGS:
            raise SystemExit(f'unknown ending {self.ending!r}; pick one of {", ".join(ENDINGS)}')
        info = STYLES[self.style]
        self.bpm = float(bpm or m.get('bpm') or info['bpm'])
        self.key = key or m.get('key') or info['key']
        self.minor = info['minor'] if minor is None else minor
        self.seed = seed if seed is not None else m.get('seed', 11)
        self.track, self.repeat = track, repeat
        self.music_db = music_db if music_db is not None else m.get('gain_db', 0.0)
        self.settings = {'voice': voice, 'lang': lang, 'speed': speed, 'voice_from': voice_from, 'fps': fps, 'size': size, 'length': length, 'loudness': loudness}
        self.lead = lead
        self.cuts = None
        self.lines, self.sfx, self.levels = [], [], []
        self.button_at = None
        self.consts = {}

    @property
    def beat(self):
        return 60 / self.bpm

    @property
    def bar(self):
        return 4 * self.beat

    def _scenes(self, lengths, unit):
        cuts = [0.0]
        for k in lengths:
            beats = k * unit / self.beat
            if abs(beats - round(beats)) > 1e-6:
                raise SystemExit(f'a scene of {k} is {beats:.2f} beats; scenes are whole beats ({self.beat:.4f} s at {self.bpm:g} BPM)')
            cuts.append(cuts[-1] + round(beats) * self.beat)
        self.cuts = [round(c, 4) for c in cuts]
        return self.cuts

    def bars(self, *lengths):
        return self._scenes(lengths, self.bar)

    def beats(self, *lengths):
        return self._scenes(lengths, self.beat)

    def seconds(self, *lengths):
        cuts = [0.0]
        for k in lengths:
            cuts.append(cuts[-1] + k)
        self.cuts = [round(c, 4) for c in cuts]
        return self.cuts

    def _need_cuts(self):
        if self.cuts is None:
            raise SystemExit('set the scenes first: s.bars(...), s.beats(...) or s.seconds(...)')

    def line(self, scene, text, *, after=None, at=None, speed=None, voice=None, lang=None, ipa=None, file=None, pan=None):
        self._need_cuts()
        start = at if at is not None else self.cuts[scene] + (self.lead if after is None else after)
        ln = {'at': round(start, 3), 'text': text}
        for k, v in (('speed', speed), ('voice', voice), ('lang', lang), ('ipa', ipa), ('file', file), ('pan', pan)):
            if v is not None:
                ln[k] = v
        self.lines.append(ln)
        return ln['at']

    def energy(self, at, level):
        if level not in (0, 1, 2, 3):
            raise SystemExit('energy is 0, 1, 2 or 3')
        self.levels.append([round(at, 3), level])

    def arc(self, *levels):
        self._need_cuts()
        if len(levels) != len(self.cuts) - 1:
            raise SystemExit(f'arc takes one level per scene: {len(self.cuts) - 1} scenes, {len(levels)} levels')
        for at, level in zip(self.cuts, levels):
            self.energy(at, level)

    def cue(self, name, at, gain=None, *, pan=None, **params):
        if name not in SOUNDS:
            raise SystemExit(f'unknown sound {name!r}; pick one of {", ".join(SOUNDS)}')
        extra = set(params) - PARAMS[name]
        if extra:
            raise SystemExit(f'{name} takes {", ".join(sorted(PARAMS[name])) or "no options"}, not {", ".join(sorted(extra))}')
        c = {'fx': name, 'at': round(max(0.0, at), 3), **params}
        if gain is not None:
            c['gain'] = gain
        if pan is not None:
            c['pan'] = pan
        self.sfx.append(c)
        return c

    def on_cuts(self, name='swipe', before=0.3, gain=None, **params):
        self._need_cuts()
        for k, at in enumerate(self.cuts[1:-1]):
            p = dict(params)
            if name == 'swipe' and 'dir' not in p:
                p['dir'] = 'up' if k % 2 == 0 else 'down'
            self.cue(name, at - before, gain, **p)

    def lift(self, at, d=None, gain=None):
        d = min(d or self.bar, at)
        if d >= 0.3:
            self.cue('rise', at - d, gain, d=round(d, 3))
        self.cue('drop', at, gain)

    def page(self, **consts):
        self.consts.update(consts)

    def button(self, at):
        self.button_at = round(at, 3)

    def write(self):
        self._need_cuts()
        end = self.cuts[-1]
        self.lines.sort(key=lambda ln: ln['at'])
        music = {'style': self.style, 'ending': self.ending, 'bpm': self.bpm, 'key': self.key, 'minor': self.minor, 'seed': self.seed,
                 'energy': sorted(self.levels or self._default_levels()), 'gain_db': self.music_db}
        if self.track:
            music['track'] = self.track
            if self.repeat is not None:
                music['repeat'] = self.repeat
        if self.button_at is not None:
            music['button'] = self.button_at
        length = self.settings['length'] or (STUDIO.get('length', [20, 60]) if self.lines else [0, 3600])
        score = {'duration': end, 'cuts': self.cuts[:-1], 'music': music, 'sfx': sorted(self.sfx, key=lambda c: c['at']), 'length': length}
        for k in ('voice', 'lang', 'speed', 'voice_from', 'fps', 'size', 'loudness'):
            if self.settings[k] is not None:
                score[k] = self.settings[k]
        if 'loudness' not in score and not self.lines and self.style == 'none' and not self.track:
            score['loudness'] = False
        for ln in self.lines:
            if not 0 <= ln['at'] < end:
                raise SystemExit(f"the line at {ln['at']} s starts outside the video (0 to {end} s)")
        if self.ending == 'loop' and self.style != 'none':
            cycle = self.bar * STYLES[self.style]['bars_per_chord'] * len(STYLES[self.style]['chords'])
            if abs(end / cycle - round(end / cycle)) > 1e-3:
                print(f'note: {end:.2f} s is not a whole chord cycle ({cycle:.2f} s), so the harmony jumps at the loop point. {max(1, round(end / cycle)) * cycle:.2f} s loops cleanly.')
        (self.here / 'score.json').write_text(json.dumps(score, indent=1))
        (self.here / 'lines.json').write_text(json.dumps(self.lines, indent=1, ensure_ascii=False))
        page = self.here / 'index.html'
        if page.exists():
            text = re.sub(r'const CUTS = \[[^\]]*\]', 'const CUTS = ' + json.dumps(self.cuts), page.read_text())
            for name, value in self.consts.items():
                literal = "'" + value.replace("'", "\\'") + "'" if isinstance(value, str) else json.dumps(value)
                text, k = re.subn(rf'const {name} = [^\n]*', lambda m: f'const {name} = {literal}', text, count=1)
                if not k:
                    raise SystemExit(f'index.html has no `const {name} = ...` line to fill')
            page.write_text(text)
        print(f"cuts {self.cuts}  lines {len(self.lines)}  cues {len(self.sfx)}  music {self.track or self.style} {self.bpm:g} BPM {self.key}{'m' if self.minor else ''}  ending {self.ending}")
        return score

    def _default_levels(self):
        if self.ending == 'loop' or len(self.cuts) == 2:
            return [[0.0, 2]]
        return [[0.0, 1]] + [[c, 2] for c in self.cuts[1:-1]]
