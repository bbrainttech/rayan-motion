import numpy as np

from dsp import SR, bp, fade, fm, hp, hz, lp, norm, pan2, sweep, tt
from styles import GAIN, MAJOR, MINOR, REVERB, tonic

class Key:
    def __init__(self, key, minor):
        self.pc = tonic(key)
        self.scale = MINOR if minor else MAJOR

    def note(self, deg=1, octave=5):
        d = deg - 1
        return 12 * (octave + 1) + self.pc + self.scale[d % 7] + 12 * (d // 7)


def tap(rng, c, k):
    t = tt(0.12)
    tone = c.get('tone', 1.0)
    edge = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t / 0.0015)
    body = np.sin(2 * np.pi * 820 * tone * t) * np.exp(-t / 0.018) + 0.5 * np.sin(2 * np.pi * 1930 * tone * t) * np.exp(-t / 0.009)
    return norm(np.tanh(1.2 * (edge * 0.6 + body * 0.8)))


def latch(rng, c, k):
    out = np.zeros(int(0.2 * SR))
    for at, tone, g in ((0.0, 1.0, 1.0), (0.045, 0.78, 0.7)):
        x = tap(rng, {'tone': tone}, k) * g
        i = int(at * SR)
        out[i:i + len(x)] += x[: len(out) - i]
    return norm(out)


def pop(rng, c, k):
    f = hz(c['note']) if 'note' in c else hz(k.note(c.get('deg', 5), c.get('octave', 5)))
    t = tt(0.22)
    fr = f * (0.5 + 0.5 * (1 - np.exp(-t / 0.008)))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) * np.exp(-t / 0.06) + 0.2 * np.sin(2 * ph) * np.exp(-t / 0.025)
    return norm(fade(y * np.minimum(1, t / 0.001), 0, 0.02))


def snap(rng, c, k):
    t = tt(0.12)
    a = bp(rng.standard_normal(len(t)), 1800, 5500) * np.exp(-t / 0.004)
    b = np.zeros(len(t))
    i = int(0.006 * SR)
    b[i:] = bp(rng.standard_normal(len(t) - i), 2200, 6000) * np.exp(-t[: len(t) - i] / 0.003) * 0.5
    return norm(a + b + np.sin(2 * np.pi * 2200 * t) * np.exp(-t / 0.003) * 0.3)


def keystroke(rng, heavy=False):
    t = tt(0.09)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.0012) * 0.5
    f = rng.uniform(170, 230) if heavy else rng.uniform(280, 420)
    thock = np.sin(2 * np.pi * f * t) * np.exp(-t / (0.02 if heavy else 0.012))
    clack = bp(rng.standard_normal(len(t)), 800, 2500) * np.exp(-t / 0.006) * 0.4
    return click + thock + clack


def keys(rng, c, k):
    dur, n = c.get('dur', 1.0), max(1, int(c.get('n', 10)))
    out = np.zeros((int((dur + 0.2) * SR), 2))
    for i in range(n):
        at = dur * i / n + rng.uniform(-0.25, 0.25) * dur / n
        heavy = i % 5 == 4
        x = pan2(keystroke(rng, heavy) * rng.uniform(0.6, 1.0) * (1.2 if heavy else 1), rng.uniform(-0.25, 0.25))
        j = int(max(0.0, at) * SR)
        out[j:j + len(x)] += x[: len(out) - j]
        up = keystroke(rng) * 0.25
        j += int(rng.uniform(0.04, 0.07) * SR)
        out[j:j + len(up)] += pan2(up, 0)[: max(0, len(out) - j)]
    return norm(out)


def count(rng, c, k):
    dur, n = c.get('dur', 1.0), max(2, int(c.get('n', 12)))
    out = np.zeros(int((dur + 0.1) * SR))
    for i in range(n):
        u = i / (n - 1)
        at = dur * (1 - (1 - u) ** 0.5)
        t = tt(0.05)
        f = 1300 * 2 ** (u * 3 / 12)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + bp(rng.standard_normal(len(t)), 2000, 6000) * np.exp(-t / 0.002) * 0.3
        j = int(at * SR)
        out[j:j + len(x)] += x[: len(out) - j] * (0.6 + 0.4 * u)
    return norm(out)


def swipe(rng, c, k):
    d = c.get('d', 0.45)
    up = c.get('dir', 'up') != 'down'
    t = tt(d + 0.15)
    n = rng.standard_normal(len(t))
    y = sweep(n, *((400, 6000) if up else (6000, 400)), 'band', 1.2, curve=0.8)
    delay = (0.003 - 0.0027 * np.minimum(t / d, 1)) * SR
    pos = np.clip(np.arange(len(t)) - delay, 0, len(t) - 1)
    y = y + 0.7 * np.interp(pos, np.arange(len(t)), y)
    u = np.minimum(t / d, 1)
    env = np.where(u < 0.6, (u / 0.6) ** 2, np.exp(-(t - 0.6 * d) / (0.18 * d)))
    pan = np.linspace(-0.6, 0.6, len(t)) * (1 if up else -1)
    y = y * env
    return norm(np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)], axis=1))


def air(rng, c, k):
    d = c.get('d', 0.8)
    t = tt(d)
    y = lp(hp(rng.standard_normal((len(t), 2)), 200), 2500)
    env = np.sin(np.pi * t / d) ** 2
    return norm(y * env[:, None])


def slide(rng, c, k):
    d = c.get('d', 0.5)
    t = tt(d + 0.2)
    n = rng.standard_normal(len(t))
    y = sweep(n, 1400, 350, 'band', 0.8)
    u = np.minimum(t / d, 1)
    y = y * u ** 1.5 * np.where(t < d, 1, np.exp(-(t - d) / 0.03))
    i = int(d * SR)
    contact = np.zeros(len(t))
    tc = t[: len(t) - i]
    contact[i:] = np.sin(2 * np.pi * 140 * tc) * np.exp(-tc / 0.05) * 0.8 + bp(rng.standard_normal(len(tc)), 500, 2000) * np.exp(-tc / 0.01) * 0.3
    return norm(y * 0.7 + contact)


def glitch(rng, c, k):
    d = c.get('d', 0.3)
    out = np.zeros(int(d * SR))
    j = 0
    while j < len(out):
        L = int(rng.uniform(0.01, 0.04) * SR)
        kind = rng.integers(3)
        t = tt(L / SR)
        if kind == 0:
            seg = np.sign(np.sin(2 * np.pi * rng.uniform(200, 2000) * t))
        elif kind == 1:
            seg = rng.standard_normal(len(t))
        else:
            seg = np.zeros(len(t))
        seg = np.round(seg * 7) / 7
        seg = np.repeat(seg[::4], 4)[: len(t)]
        out[j:j + len(seg)] = seg[: len(out) - j] * rng.uniform(0.4, 1)
        j += len(seg)
    return norm(lp(out, 9000))


def ding(rng, c, k):
    f = hz(c['note']) if 'note' in c else hz(k.note(c.get('deg', 1), c.get('octave', 6)))
    t = tt(1.6)
    y = fm(f, 1.6, 2.0, 1.2, 0.5, 0.05) + 0.3 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.2)
    return norm(fade(y, 0.001, 0.05))


def shimmer(rng, c, k):
    pent = [1, 2, 3, 5, 6] if k.scale == MAJOR else [1, 3, 4, 5, 7]
    out = np.zeros((int(1.2 * SR), 2))
    for i, deg in enumerate(pent):
        f = hz(k.note(deg, c.get('octave', 6)))
        t = tt(0.9)
        x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.08)) * np.minimum(1, t / 0.002) * np.exp(-t / 0.28)
        x = pan2(x, -0.6 + 0.3 * i)
        j = int(0.034 * i * SR)
        out[j:j + len(x)] += x[: len(out) - j]
    return norm(out)


def rise(rng, c, k):
    d = c.get('d', 1.6)
    t = tt(d)
    u = t / d
    f0 = hz(k.note(1, 3))
    ph = 2 * np.pi * np.cumsum(f0 * 2 ** (u ** 2)) / SR
    tone = sum(np.sin(ph * h + 0.4 * h) / h for h in (1, 2, 3, 4, 5, 6))
    tone = sweep(tone, 300, 8000, 'low', 0.9, curve=1.4)
    noise = sweep(rng.standard_normal(len(t)), 500, 9000, 'high', 0.7, curve=1.2)
    y = (tone * 0.7 + noise * 0.5) * u ** 1.8
    return norm(fade(np.stack([y, np.roll(y, 37)], axis=1), 0.0, 0.01))


def drop(rng, c, k):
    t = tt(c.get('d', 1.2))
    f = 34 + 76 * np.exp(-t / 0.22)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    burst = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.2) * 0.35
    return norm(np.tanh(1.4 * (sub + burst)))


MAKERS = {
    'tap': tap, 'latch': latch, 'pop': pop, 'snap': snap, 'keys': keys, 'count': count,
    'swipe': swipe, 'air': air, 'slide': slide, 'glitch': glitch,
    'ding': ding, 'shimmer': shimmer, 'rise': rise, 'drop': drop,
}

MUSIC_BUS = {'rise', 'drop'}


def make(name, rng, cue, key):
    if name not in MAKERS:
        raise SystemExit(f'unknown sound {name!r}; pick one of {", ".join(MAKERS)}')
    return MAKERS[name](rng, cue, key)
