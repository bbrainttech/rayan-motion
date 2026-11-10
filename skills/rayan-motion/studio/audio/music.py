import numpy as np

from dsp import SR, add, bp, echoes, fade, fm, hp, hz, lp, norm, pan2, saw, square, sweep, tt
from styles import MAJOR, MINOR, QUALITIES, STYLES, tonic


def voice_lead(prev, notes, lo, hi):
    best, best_cost = None, None
    for inv in range(len(notes)):
        cand = sorted(notes[inv:] + [m + 12 for m in notes[:inv]])
        for shift in range(-48, 49, 12):
            c = [m + shift for m in cand]
            if c[0] < lo or c[-1] > hi:
                continue
            if prev:
                cost = sum(min(abs(a - b) for b in prev) for a in c) + 2 * abs(sum(c) / len(c) - sum(prev) / len(prev))
            else:
                cost = abs(sum(c) / len(c) - (lo + hi) / 2)
            if best_cost is None or cost < best_cost:
                best, best_cost = c, cost
    if best is None:
        best = sorted(notes)
        while best[-1] > hi + 6:
            best = [m - 12 for m in best]
    return best


def pad_note(rng, f, d, attack=0.6, release=1.4, bright=0.5, detune=5):
    t = tt(d + release)
    a = 0.5 - 0.5 * np.cos(np.pi * np.minimum(t / attack, 1))
    env = a * np.where(t < d, 1.0, np.exp(-(t - d) / (release / 4)))
    out = np.zeros((len(t), 2))
    for side, c in ((0, -detune), (1, detune)):
        ph = 2 * np.pi * f * 2 ** (c / 1200) * t + rng.uniform(0, 2 * np.pi)
        lfo = 1 + 0.22 * np.sin(2 * np.pi * rng.uniform(0.11, 0.29) * t + rng.uniform(0, 6.28))
        out[:, side] = (np.sin(ph) + 0.3 * bright * np.sin(2 * ph) + 0.1 * bright * np.sin(3 * ph)) * lfo
    return out * env[:, None]


def bell(f, vel=0.8, d=2.2):
    t = tt(d)
    y = fm(f, d, 3.5, 0.4 + 1.5 * vel, 1.0 if f < 700 else 0.65, 0.08)
    y = y + 0.32 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.45) + 0.18 * np.sin(2 * np.pi * f * t) * np.exp(-t / 1.6)
    if f * 4 < 16000:
        y = y + 0.16 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.15)
    return fade(norm(y) * (0.55 + 0.45 * vel), 0.001, 0.06)


def sub(f, d, glide=None):
    t = tt(d + 0.08)
    fr = np.full(len(t), f) if glide is None else f * (glide / f) ** np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    env = np.minimum(1, t / 0.006) * np.where(t < d, 1, np.exp(-(t - d) / 0.025))
    return np.tanh(1.6 * np.sin(ph)) * env * 0.8


def boom(d=1.4):
    t = tt(d)
    f = 34 + 76 * np.exp(-t / 0.25)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    return norm(np.tanh(1.3 * y))


def swell(freqs, d):
    t = tt(d)
    y = sum(np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t) for f in freqs)
    return fade(norm(y) * (t / d) ** 3, 0.0, 0.012)


def felt_kick(rng):
    t = tt(0.45)
    body = np.sin(2 * np.pi * np.cumsum(42 + 58 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.2)
    felt = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.008) * 0.35
    return norm(np.tanh(1.2 * (body + felt)))


def punch_kick(rng):
    t = tt(0.5)
    body = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t / 0.022) + 40 * np.exp(-t / 0.12)) / SR) * np.exp(-t / 0.26)
    knock = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.3
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.0015) * 0.4
    return norm(np.tanh(1.8 * (body + knock + click)))


def dusty_kick(rng):
    t = tt(0.4)
    body = np.sin(2 * np.pi * np.cumsum(46 + 44 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.17)
    dust = lp(rng.standard_normal(len(t)), 1200) * np.exp(-t / 0.02) * 0.3
    return norm(lp(np.tanh(2.2 * (body + dust)), 1800))


def heart(rng):
    t = tt(0.5)
    return norm(np.sin(2 * np.pi * np.cumsum(38 + 24 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.14) * np.minimum(1, t / 0.004))


def rim(rng):
    t = tt(0.15)
    tone = np.sin(2 * np.pi * 1720 * t) * np.exp(-t / 0.012) + 0.6 * np.sin(2 * np.pi * 480 * t) * np.exp(-t / 0.03)
    return norm(tone + bp(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t / 0.008) * 0.8)


def clap(rng):
    t = tt(0.4)
    env = np.zeros(len(t))
    for at in (0.0, 0.009, 0.018):
        i = int(at * SR)
        env[i:] += np.exp(-(t[i:] - at) / 0.004)
    env += np.where(t > 0.018, np.exp(-(t - 0.018) / 0.11), 0) * 0.7
    return norm(bp(rng.standard_normal(len(t)), 900, 5200) * env)


def snare(rng):
    t = tt(0.35)
    noise = bp(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t / 0.1)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03)
    return norm(lp(noise * 0.9 + tone * 0.6, 5200))


def shaker(rng):
    t = tt(0.09)
    env = np.minimum(1, t / 0.006) * np.exp(-np.maximum(t - 0.006, 0) / 0.03)
    return norm(bp(rng.standard_normal(len(t)), 4500, 11000) * env)


METAL = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]


def hat(rng, open_=False):
    t = tt(0.5 if open_ else 0.09)
    m = sum(np.sign(np.sin(2 * np.pi * f * 1.42 * t + rng.uniform(0, 6.28))) for f in METAL)
    y = hp(m, 7000, 4) * np.exp(-t / (0.16 if open_ else 0.022))
    y = y + hp(rng.standard_normal(len(t)), 9000) * np.exp(-t / (0.12 if open_ else 0.015)) * 0.5
    return norm(y)


def crash(rng):
    t = tt(2.2)
    m = sum(np.sign(np.sin(2 * np.pi * f * 2.1 * t + rng.uniform(0, 6.28))) for f in METAL)
    return norm(hp(m * 0.4 + rng.standard_normal(len(t)), 4500) * np.exp(-t / 0.7) * np.minimum(1, t / 0.002))


def saw_bass(f, d, cutoff, accent=1.0):
    t = tt(d + 0.03)
    x = 0.5 * (saw(f, d + 0.03, -7) + saw(f, d + 0.03, 7)) + 0.25 * np.sin(np.pi * f * t)
    dark, bright = lp(x, cutoff * 0.5), lp(x, min(cutoff * 3 * accent, 12000))
    y = dark + (bright - dark) * np.exp(-t / 0.06)
    env = np.minimum(1, t / 0.003) * np.where(t < d, 1, np.exp(-(t - d) / 0.01))
    return np.tanh(1.4 * y * env)


def supersaw(freqs, d, cutoff, release=0.08):
    t = tt(d + release)
    out = np.zeros((len(t), 2))
    for f in freqs:
        for k, c in enumerate((-14, -6, 0, 6, 14)):
            out += pan2(saw(f, d + release, c), (-0.8, -0.4, 0, 0.4, 0.8)[k]) * 0.2
    env = np.minimum(1, t / 0.004) * np.where(t < d, 1, np.exp(-(t - d) / (release / 3)))
    return lp(out, cutoff) * env[:, None]


def chip(f, d):
    t = tt(d + 0.05)
    return lp(square(f, d + 0.05), 2600) * np.minimum(1, t / 0.002) * np.exp(-t / 0.09)


def tine(f, d, vel=0.8):
    t = tt(d + 0.6)
    idx = (0.6 + 1.6 * vel) * np.exp(-t / 0.35)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    if f * 14 < 18000:
        y = y + np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.012) * 0.12 * vel
    amp = np.minimum(1, t / 0.002) * np.exp(-t / 1.4) * np.where(t < d, 1, np.exp(-(t - d) / 0.12))
    return y * amp * (0.5 + 0.5 * vel)


def upright(rng, f, d):
    t = tt(d + 0.1)
    ph = 2 * np.pi * f * t
    y = np.sin(ph) + 0.35 * np.sin(2 * ph) * np.exp(-t / 0.12) + 0.12 * np.sin(3 * ph) * np.exp(-t / 0.06)
    thump = lp(rng.standard_normal(len(t)), 700) * np.exp(-t / 0.01) * 0.3
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.45) * np.where(t < d, 1, np.exp(-(t - d) / 0.03))
    return np.tanh(1.3 * (y * env + thump))


def grain(f, d=1.6):
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.2)
    return y * np.minimum(1, t / 0.005) * np.exp(-t / 0.7)


def drone(rng, f, d, period=None):
    t = tt(d)
    y = np.zeros((len(t), 2))
    for k, (ff, g) in enumerate(((f, 1.0), (f * 1.5, 0.55), (f * 2, 0.3))):
        for side, beat in ((0, -0.13), (1, 0.17)):
            fr = ff + beat * (k + 1)
            if period:
                fr = round(fr * period) / period
            y[:, side] += np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.28)) * g
    if period:
        return y
    env = 0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 3.0, 1))
    return y * env[:, None]


def crackle(rng, n):
    out = np.zeros((n, 2))
    for c in range(2):
        k = rng.poisson(9 * n / SR)
        pos = rng.integers(0, n, k)
        np.add.at(out[:, c], pos, rng.uniform(0.05, 1, k) ** 2 * rng.choice([-1.0, 1.0], k))
    return hp(out, 1500) * 0.5 + lp(rng.standard_normal((n, 2)), 3500) * 0.01


def wobble(x, depth=0.0018, rate=0.55, flutter=0.00012, frate=7.3):
    n = len(x)
    t = np.arange(n) / SR
    pos = np.clip(np.arange(n) - (depth * np.sin(2 * np.pi * rate * t) + flutter * np.sin(2 * np.pi * frate * t)) * SR, 0, n - 1)
    return np.stack([np.interp(pos, np.arange(n), x[:, c]) for c in range(2)], axis=1)


class Song:
    def __init__(self, music, n, duration):
        self.name = music.get('style', 'glass')
        if self.name not in STYLES:
            raise SystemExit(f'unknown music style {self.name!r}; pick one of {", ".join(STYLES)}')
        self.st = STYLES[self.name]
        self.bpm = float(music.get('bpm') or self.st['bpm'])
        self.beat = 60 / self.bpm
        self.bar = 4 * self.beat
        key = music.get('key') or self.st['key']
        self.key_pc = tonic(key)
        self.minor = bool(music.get('minor', self.st['minor']))
        self.scale = MINOR if self.minor else MAJOR
        self.swing = self.st.get('swing', 0.5)
        self.rng = np.random.default_rng(music.get('seed', 11))
        self.n, self.duration = n, duration
        self.ending = music.get('ending', 'ring')
        self.levels = sorted((round(at / self.bar) * self.bar, int(lv)) for at, lv in (music.get('energy') or [[0, 2]]))
        self.bus = {k: np.zeros((n, 2)) for k in ('keys', 'pad', 'bass', 'drums', 'lead')}
        self.send = np.zeros((n, 2))
        self.echo = np.zeros((n, 2))
        self.kicks = []
        self.cut = None
        self.prev = {}
        self.kit = {}

    def level(self, t):
        lv = self.levels[0][1]
        for at, v in self.levels:
            if at <= t + 1e-6:
                lv = v
        return max(0, min(3, lv))

    def chord(self, b, final=False):
        off, q = self.st['final'] if final else self.st['chords'][(b // self.st['bars_per_chord']) % len(self.st['chords'])]
        base = 48 + (self.key_pc + off) % 12
        return base, [base + o for o in QUALITIES[q]]

    def voiced(self, part, notes, lo, hi):
        v = voice_lead(self.prev.get(part), notes, lo, hi)
        self.prev[part] = v
        return v

    def low(self, base):
        m = base - 12
        return m - 12 if m > 43 else m

    def play(self, bus, x, t, gain, pan=0.0, rev=0.0, echo=0.0):
        if t < -1e-6 or (self.cut is not None and t >= self.cut - 1e-6):
            return
        x = pan2(x, pan) * gain
        add(self.bus[bus], x, t)
        if rev:
            add(self.send, x, t, rev)
        if echo:
            add(self.echo, x, t, echo)

    def hit(self, name, t, gain, pan=0.0, rev=0.12, jitter=0.0):
        if jitter:
            t += self.rng.normal(0, jitter)
        self.play('drums', self.kit[name], max(0.0, t), gain, pan, rev)
        if name in ('kick', 'boom'):
            self.kicks.append(t)

    def flush_echo(self):
        if not self.echo.any():
            return
        e = echoes(self.echo, 0.75 * self.beat, 4, 0.45, 3600)
        self.bus['keys'] += e
        self.send += e * 0.4
        self.echo[:] = 0

    def gate(self, t):
        i = int(t * SR)
        g = np.ones(self.n)
        w = int(0.025 * SR)
        g[i:i + w] = np.linspace(1, 0, len(g[i:i + w]))
        g[i + w:] = 0
        for k in self.bus:
            self.bus[k] *= g[:, None]
        self.send *= g[:, None]


class Glass:
    def setup(self, s):
        s.kit = {'kick': felt_kick(s.rng), 'rim': rim(s.rng), 'clap': clap(s.rng), 'shaker': shaker(s.rng), 'open': hat(s.rng, True), 'boom': boom()}

    def bar(self, s, b, t0, base, notes, e, prev, nxt):
        beat, ei, sx = s.beat, s.beat / 2, s.beat / 4
        for k, m in enumerate(s.voiced('pad', notes, 50, 79)):
            s.play('pad', pad_note(s.rng, hz(m), s.bar * 0.98, 0.5 if e else 0.9, 1.6, 0.35 + 0.15 * e), t0, 0.07 if e else 0.05, pan=-0.4 + 0.8 * (k % 2), rev=0.5)
        keys = s.voiced('keys', notes, 62, 88)
        if e == 0:
            s.play('keys', bell(hz(keys[-1]), 0.5), t0, 0.16, rev=0.6, echo=0.3)
        else:
            order = [1, 3, len(keys) - 1] if b % 2 == 0 else [len(keys) - 1, 2, 0]
            for pos, idx, pan in zip((0, 3, 6), order, (-0.3, 0.25, 0.05)):
                s.play('keys', bell(hz(keys[min(idx, len(keys) - 1)]), 0.8 if pos == 0 else 0.6), t0 + pos * ei, 0.28, pan, rev=0.35, echo=0.35)
            if e >= 2:
                s.play('keys', bell(hz(keys[2]), 0.45), t0 + 15 * sx, 0.12, 0.3, rev=0.3, echo=0.2)
            if e >= 3:
                for k, pos in enumerate((1, 5, 7)):
                    s.play('keys', bell(hz(keys[(k + b) % len(keys)] + 12), 0.35), t0 + pos * ei, 0.07, (-0.6, 0.6, -0.2)[k], rev=0.5, echo=0.3)
        r = s.low(base)
        if e >= 1:
            s.play('bass', sub(hz(r), beat * 1.4), t0, 0.19)
        if e >= 2:
            s.play('bass', sub(hz(r), beat * 0.6, hz(r - 5)), t0 + 3 * ei, 0.15)
            s.play('bass', sub(hz(r + 12), beat * 0.5), t0 + 6 * ei, 0.1)
            s.hit('kick', t0, 0.42)
            s.hit('kick', t0 + 3 * ei, 0.32)
            s.hit('rim', t0 + 2 * beat, 0.3, 0.15)
            for i in range(16):
                s.hit('shaker', t0 + i * sx, (0.3, 0.11, 0.2, 0.11)[i % 4], 0.35, rev=0.05, jitter=0.002)
        if e >= 3:
            s.hit('clap', t0 + 2 * beat, 0.26, rev=0.3)
            s.hit('open', t0 + 7 * ei, 0.1, -0.3)
        if nxt > e and nxt >= 2:
            _, up = s.chord(b + 1)
            top = s.voiced('swell', up, 70, 92)[-3:]
            s.play('keys', swell([hz(m) for m in top], beat), t0 + 3 * beat, 0.1, rev=0.6)

    def final(self, s, t, ring):
        base, notes = s.chord(0, True)
        for k, m in enumerate(s.voiced('keys', notes, 62, 90)):
            s.play('keys', bell(hz(m), 0.7, 3.5), t + k * 0.035, 0.16, -0.5 + k / max(1, len(notes) - 1), rev=0.6, echo=0.25)
        for k, m in enumerate(s.voiced('pad', notes, 50, 79)):
            s.play('pad', pad_note(s.rng, hz(m), ring, 0.3, 1.2, 0.5), t, 0.07, -0.4 + 0.8 * (k % 2), rev=0.6)
        s.play('bass', sub(hz(s.low(base)), ring * 0.8), t, 0.3)
        s.hit('kick', t, 0.45)

    def button(self, s, t):
        base, notes = s.chord(0, True)
        keys = s.voiced('keys', notes, 62, 90)
        s.play('keys', swell([hz(m) for m in keys[-3:]], s.beat), t - s.beat, 0.12, rev=0.5)
        for k, m in enumerate(keys):
            s.play('keys', bell(hz(m), 1.0, 2.6), t, 0.17, -0.5 + k / max(1, len(keys) - 1), rev=0.5)
        s.hit('kick', t, 0.6)
        s.hit('clap', t, 0.3, rev=0.4)
        s.hit('boom', t, 0.4)


class Pulse:
    def setup(self, s):
        s.kit = {'kick': punch_kick(s.rng), 'clap': clap(s.rng), 'hat': hat(s.rng), 'open': hat(s.rng, True), 'snare': snare(s.rng), 'crash': crash(s.rng), 'boom': boom()}

    def bar(self, s, b, t0, base, notes, e, prev, nxt):
        sx = s.beat / 4
        pad = s.voiced('pad', notes, 48, 76)
        s.play('pad', supersaw([hz(m) for m in pad], s.bar * 0.97, (1000, 1600, 3400, 5000)[e], 0.5), t0, 0.14, rev=0.45)
        r = s.low(base)
        if e == 0:
            s.hit('kick', t0, 0.24)
        if e >= 2 and e > prev:
            s.hit('crash', t0, 0.12, 0.2, rev=0.3)
        if e >= 1:
            octs = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 0, 12]
            accents = {0: 1.3, 3: 1.15, 6: 1.15, 10: 1.2, 12: 1.1}
            for i in range(16):
                acc = accents.get(i, 0.85)
                s.play('bass', saw_bass(hz(r + octs[i]), sx * 0.8, (0, 700, 1400, 2200)[e], acc), t0 + i * sx, 0.13 * acc)
            for i in (2, 6, 10, 14):
                s.hit('open' if e >= 3 else 'hat', t0 + i * sx, 0.16 if e >= 3 else 0.22, 0.25, jitter=0.0015)
        if e >= 2:
            for i, g in ((0, 0.38), (10, 0.32)) + (((7, 0.2),) if e >= 3 else ()):
                s.hit('kick', t0 + i * sx, g, rev=0.02)
            for i in (4, 12):
                s.hit('clap', t0 + i * sx, 0.45, rev=0.25)
            for i in range(16):
                if i % 4 != 2:
                    s.hit('hat', t0 + i * sx, 0.08 + 0.05 * (i % 2 == 0), -0.2, jitter=0.0015)
        if e >= 3:
            stab = s.voiced('stab', notes, 60, 86)
            for i in (2, 6, 10, 14):
                s.play('keys', supersaw([hz(m) for m in stab], sx * 0.9, 5200, 0.12), t0 + i * sx, 0.075, rev=0.3, echo=0.25)
            for i in range(16):
                s.play('lead', chip(hz(stab[(i * 3) % len(stab)] + 12), sx * 0.6), t0 + i * sx, 0.04, 0.4 if i % 2 else -0.4, echo=0.3)
        if nxt > e and nxt >= 2:
            times = [t0 + i * sx for i in range(8, 12)] + [t0 + 12 * sx + k * sx / 2 for k in range(8)]
            for k, t in enumerate(times):
                s.hit('snare', t, 0.05 + 0.17 * (k / len(times)) ** 1.5, 0.1, rev=0.2)
            noise = s.rng.standard_normal((int(s.bar * SR), 2))
            ramp = (np.arange(len(noise)) / len(noise)) ** 2
            s.play('drums', sweep(noise * ramp[:, None], 400, 9000, 'high', 0.7), t0, 0.05, rev=0.3)

    def final(self, s, t, ring):
        base, notes = s.chord(0, True)
        pad = s.voiced('pad', notes, 48, 76)
        s.play('pad', supersaw([hz(m) for m in pad], ring * 0.85, 2400, 1.2), t, 0.05, rev=0.6)
        s.play('bass', sub(hz(s.low(base)), ring * 0.7), t, 0.32)
        s.hit('kick', t, 0.6)
        s.hit('crash', t, 0.12, rev=0.4)

    def button(self, s, t):
        base, notes = s.chord(0, True)
        stab = s.voiced('stab', notes, 60, 86)
        s.play('keys', supersaw([hz(m) for m in stab], 0.35, 6000, 0.6), t, 0.07, rev=0.5)
        s.play('bass', sub(hz(s.low(base)), 0.5), t, 0.3)
        s.hit('kick', t, 0.65)
        s.hit('clap', t, 0.35, rev=0.4)
        s.hit('crash', t, 0.14, rev=0.4)
        s.hit('boom', t, 0.35)


class Lofi:
    def setup(self, s):
        s.kit = {'kick': dusty_kick(s.rng), 'snare': snare(s.rng), 'hat': hat(s.rng), 'rim': rim(s.rng)}
        n = int(round(s.duration * SR))
        s.bus['pad'][:n] += crackle(s.rng, n) * 0.05

    def at(self, s, t0, i):
        beat, k = divmod(i, 4)
        return t0 + (beat + (0, s.swing * 0.5, 0.5, 0.5 + s.swing * 0.5)[k]) * s.beat

    def strum(self, s, t, notes, d, vel, gain=0.19, spread=0.02):
        for k, m in enumerate(notes):
            s.play('keys', tine(hz(m), d, vel * s.rng.uniform(0.85, 1.0)), t + k * spread * s.rng.uniform(0.7, 1.3), gain, -0.35 + 0.7 * k / max(1, len(notes) - 1), rev=0.25)

    def bar(self, s, b, t0, base, notes, e, prev, nxt):
        keys = s.voiced('keys', notes, 55, 79)
        self.strum(s, self.at(s, t0, 0), keys, s.beat * 1.6, 0.75)
        if e >= 1:
            self.strum(s, self.at(s, t0, 6), keys, s.beat * 1.1, 0.5, 0.1)
        if e >= 2:
            self.strum(s, self.at(s, t0, 14), keys[1:], s.beat * 0.4, 0.35, 0.07)
        r = s.low(base)
        if e >= 1:
            nr = s.low(s.chord(b + 1)[0])
            s.play('bass', upright(s.rng, hz(r), s.beat * 0.9), self.at(s, t0, 0), 0.27)
            s.play('bass', upright(s.rng, hz(r + 7), s.beat * 0.9), self.at(s, t0, 8), 0.23)
            s.play('bass', upright(s.rng, hz(nr - 1), s.beat * 0.4), self.at(s, t0, 14), 0.17)
        if e >= 2:
            for i, g in ((0, 0.55), (7, 0.3), (10, 0.45)):
                s.hit('kick', self.at(s, t0, i), g, rev=0.05)
            for i in (4, 12):
                s.hit('snare', self.at(s, t0, i), 0.3, 0.1, rev=0.2, jitter=0.004)
            for i in range(16):
                if i % 2 == 0:
                    s.hit('hat', self.at(s, t0, i), 0.08, 0.3, jitter=0.003)
                elif s.rng.random() < 0.3:
                    s.hit('hat', self.at(s, t0, i), 0.018, 0.3, jitter=0.003)
        if e >= 3:
            scale = [(s.key_pc + d) % 12 for d in ((0, 3, 5, 7, 10) if s.minor else (0, 2, 4, 7, 9))]
            pool = sorted(m for m in range(70, 89) if m % 12 in scale)
            slots = sorted(s.rng.choice(8, size=4, replace=False))
            for slot in slots:
                s.play('lead', tine(hz(pool[s.rng.integers(len(pool))]), s.beat * 0.5, 0.6), self.at(s, t0, slot * 2), 0.1, 0.25, rev=0.3, echo=0.25)

    def final(self, s, t, ring):
        base, notes = s.chord(0, True)
        self.strum(s, t, s.voiced('keys', notes, 55, 82), ring * 0.9, 0.7, 0.15, 0.06)
        s.play('bass', upright(s.rng, hz(s.low(base)), ring * 0.6), t, 0.36)
        s.hit('kick', t, 0.4)

    def button(self, s, t):
        base, notes = s.chord(0, True)
        self.strum(s, t, s.voiced('keys', notes, 55, 82), 1.2, 0.9, 0.16, 0.012)
        s.play('bass', upright(s.rng, hz(s.low(base)), 0.6), t, 0.4)
        s.hit('kick', t, 0.6)
        s.hit('snare', t, 0.34, rev=0.3)

    def post(self, s, x):
        return np.tanh(1.3 * lp(wobble(x), 6500)) / np.tanh(1.3)


class Air:
    def setup(self, s):
        s.kit = {'heart': heart(s.rng), 'boom': boom(2.0)}
        root = 40 + (s.key_pc - 4) % 12
        looped = s.ending == 'loop'
        s.play('pad', drone(s.rng, hz(root), s.duration if looped else s.duration + 2, s.duration if looped else None), 0.0, 0.1, rev=0.4)

    def bar(self, s, b, t0, base, notes, e, prev, nxt):
        bpc = s.st['bars_per_chord']
        if b % bpc == 0 and e >= 1:
            pad = s.voiced('pad', notes, 60, 88)
            for k, m in enumerate(pad):
                s.play('pad', pad_note(s.rng, hz(m), s.bar * bpc * 0.98, 1.8, 2.5, 0.25, 7), t0, 0.05, -0.6 + 1.2 * k / max(1, len(pad) - 1), rev=0.7)
        if e >= 2:
            tones = sorted({m % 12 for m in notes})
            for slot in s.rng.choice(16, size=5 if e == 2 else 9, replace=False):
                pc = tones[s.rng.integers(len(tones))]
                m = 76 + (pc - 76) % 12 + 12 * int(s.rng.integers(0, 2))
                s.play('lead', grain(hz(m)), t0 + slot * s.beat / 4, 0.06 * s.rng.uniform(0.5, 1), s.rng.uniform(-0.8, 0.8), rev=0.6, echo=0.4)
        if e >= 3:
            s.hit('heart', t0, 0.4, rev=0.1)
            s.hit('heart', t0 + 0.2, 0.25, rev=0.1)
        if b % bpc == bpc - 1:
            _, up = s.chord(b + 1)
            top = s.voiced('swell', up, 72, 94)[-3:]
            s.play('lead', swell([hz(m) for m in top], s.beat), t0 + s.bar - s.beat, 0.06, rev=0.7)

    def final(self, s, t, ring):
        base, notes = s.chord(0, True)
        pad = s.voiced('pad', notes, 60, 88)
        for k, m in enumerate(pad):
            s.play('pad', pad_note(s.rng, hz(m), ring, 0.8, 2.0, 0.3, 7), t, 0.05, -0.6 + 1.2 * k / max(1, len(pad) - 1), rev=0.7)
        for k, m in enumerate(sorted(pad, reverse=True)):
            s.play('lead', grain(hz(m + 12)), t + 0.09 * k, 0.05, 0.6 - 0.25 * k, rev=0.6, echo=0.3)

    def button(self, s, t):
        base, notes = s.chord(0, True)
        top = s.voiced('swell', notes, 72, 94)
        s.play('lead', swell([hz(m) for m in top[-3:]], s.beat * 1.5), t - s.beat * 1.5, 0.1, rev=0.6)
        for k, m in enumerate(top):
            s.play('lead', grain(hz(m), 2.4), t, 0.08, -0.6 + 1.2 * k / max(1, len(top) - 1), rev=0.7, echo=0.3)
        s.hit('boom', t, 0.45)
        s.hit('heart', t, 0.4)


STYLE_CLASSES = {'glass': Glass, 'pulse': Pulse, 'lofi': Lofi, 'air': Air}


def ending_times(s, cuts):
    duration, bar = s.duration, s.bar
    if s.ending == 'ring':
        at = np.floor((duration - max(1.8, 0.75 * bar)) / bar) * bar
        return max(0.0, at), None
    if s.ending == 'button':
        last = cuts[-1] if cuts else 0.0
        at = last if 0.8 <= duration - last <= 4.5 else duration - 1.5
        at = round(at / s.beat) * s.beat
        return None, min(max(at, s.beat), duration - 0.3)
    return None, None


def render(music, n, duration, cuts):
    s = Song(music, n, duration)
    if s.name == 'none':
        return np.zeros((n, 2)), np.zeros((n, 2)), s
    if s.ending not in ('ring', 'button', 'loop', 'fade'):
        raise SystemExit(f'unknown ending {s.ending!r}; pick ring, button, loop or fade')
    style = STYLE_CLASSES[s.name]()
    style.setup(s)
    ring_at, button_at = ending_times(s, cuts)
    if music.get('button') is not None and s.ending == 'button':
        button_at = float(music['button'])
    stop = ring_at if ring_at is not None else button_at if button_at is not None else duration
    s.cut = button_at
    nbars = int(np.ceil(stop / s.bar - 1e-6))
    for b in range(nbars):
        t0 = b * s.bar
        e = s.level(t0)
        base, notes = s.chord(b)
        nxt = s.level(t0 + s.bar) if t0 + s.bar < stop - 1e-6 else e
        style.bar(s, b, t0, base, notes, e, s.level(t0 - s.bar) if b else e, nxt)
    if ring_at is not None:
        style.final(s, ring_at, duration - ring_at)
    if button_at is not None:
        s.flush_echo()
        s.gate(button_at)
        s.cut = None
        style.button(s, button_at)
    s.flush_echo()
    tonal = s.bus['keys'] + s.bus['pad'] + s.bus['bass'] + s.bus['lead']
    if s.name == 'pulse' and s.kicks:
        pump = np.ones(n)
        x = np.arange(int(0.24 * SR)) / SR
        shape = 1 - 0.35 * np.exp(-x / 0.09)
        for t in s.kicks:
            i = int(t * SR)
            seg = pump[i:i + len(shape)]
            pump[i:i + len(shape)] = np.minimum(seg, shape[: len(seg)])
        tonal *= pump[:, None]
    out = tonal + s.bus['drums']
    if hasattr(style, 'post'):
        out = style.post(s, out)
    return out, s.send, s
