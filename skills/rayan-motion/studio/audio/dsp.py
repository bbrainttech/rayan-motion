import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt, sosfilt_zi

SR = 48000


def tt(d):
    return np.arange(max(1, int(round(d * SR)))) / SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.45), 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x, axis=0)


def biquad(kind, f, q):
    w = 2 * np.pi * min(f, SR * 0.45) / SR
    c, a = np.cos(w), np.sin(w) / (2 * q)
    if kind == 'low':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    elif kind == 'high':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    else:
        b = [a, 0.0, -a]
    den = [1 + a, -2 * c, 1 - a]
    return np.array([[b[0] / den[0], b[1] / den[0], b[2] / den[0], 1.0, den[1] / den[0], den[2] / den[0]]])


def sweep(x, f0, f1, kind='band', q=0.9, block=256, curve=1.0):
    n = len(x)
    out = np.zeros_like(x)
    zi = None
    for s in range(0, n, block):
        u = min(1.0, ((s + block / 2) / max(n, 1)) ** curve)
        sos = biquad(kind, f0 * (f1 / f0) ** u, q)
        seg = x[s:s + block]
        if zi is None:
            zi = sosfilt_zi(sos) * 0
            if seg.ndim > 1:
                zi = np.repeat(zi[:, :, None], seg.shape[1], axis=2)
        out[s:s + block], zi = sosfilt(sos, seg, axis=0, zi=zi)
    return out


def pan2(x, pan=0.0):
    if x.ndim == 2:
        return x
    pan = np.clip(pan, -1, 1)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)


def add(dst, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(dst) or gain == 0:
        return
    x = pan2(x, pan)
    s = max(0, -i)
    j = min(len(dst), i + len(x))
    if j > max(i, 0):
        dst[max(i, 0):j] += x[s:j - i] * gain


def norm(x, peak=1.0):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


def fade(x, a=0.002, r=0.01):
    n = len(x)
    e = np.ones(n)
    ia, ir = min(n, int(a * SR)), min(n, int(r * SR))
    if ia:
        e[:ia] = np.linspace(0, 1, ia)
    if ir:
        e[n - ir:] *= np.linspace(1, 0, ir)
    return x * (e[:, None] if x.ndim == 2 else e)


def blep_saw(freq, phase=0.0):
    dt = np.clip(np.atleast_1d(np.asarray(freq, dtype=np.float64)) / SR, 1e-6, 0.45)
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    u = ph[m] / dt[m]
    y[m] -= u + u - u * u - 1
    m = ph > 1 - dt
    u = (ph[m] - 1) / dt[m]
    y[m] -= u * u + u + u + 1
    return y


def saw(f, d, cents=0.0):
    return blep_saw(np.full(len(tt(d)), f * 2 ** (cents / 1200)))


def square(f, d):
    freq = np.full(len(tt(d)), f)
    return (blep_saw(freq) - blep_saw(freq, 0.5)) * 0.5


def fm(f, d, ratio, index, decay, idx_decay, attack=0.002):
    t = tt(d)
    idx = index * np.exp(-t / idx_decay)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * ratio * t))
    return y * np.minimum(1, t / attack) * np.exp(-t / decay)


def room(rng, seconds, tau, bright, pre=0.012):
    t = tt(seconds)
    n = rng.standard_normal((len(t), 2))
    early = np.zeros((len(t), 2))
    for k in range(9):
        at = int((pre + 0.004 + rng.uniform(0, 0.06)) * SR)
        early[at, k % 2] += rng.uniform(0.25, 0.6) * (0.85 ** k)
    late = n * np.exp(-t / tau)[:, None]
    dark = lp(n * np.exp(-t / (tau * 1.6))[:, None], bright * 0.35)
    ir = lp(late, bright) * 0.7 + dark * 0.5
    ir[: int(pre * SR)] = 0
    ir = ir + early * 0.4
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def convolve(x, ir, n):
    return np.stack([fftconvolve(x[:, c], ir[:, c])[:n] for c in range(2)], axis=1)


def echoes(x, step, taps=4, feedback=0.42, tone=3800):
    out = np.zeros_like(x)
    cur = x
    for k in range(1, taps + 1):
        cur = lp(cur, tone)
        d = int(round(step * k * SR))
        if d >= len(x):
            break
        side = cur[:, 1] if k % 2 else cur[:, 0]
        col = 0 if k % 2 else 1
        out[d:, col] += side[: len(x) - d] * feedback ** k
    return out


def follower(level, attack, release, block=48):
    n = len(level)
    k = int(np.ceil(n / block))
    padded = np.concatenate([level, np.zeros(k * block - n)])
    peaks = padded.reshape(k, block).max(axis=1)
    a = np.exp(-block / (attack * SR))
    r = np.exp(-block / (release * SR))
    out = np.empty(k)
    cur = 0.0
    for i in range(k):
        v = peaks[i]
        cur = a * cur + (1 - a) * v if v > cur else r * cur + (1 - r) * v
        out[i] = cur
    return np.interp(np.arange(n), np.arange(k) * block + block / 2, out)


def true_peak(x, chunk=SR * 8):
    out = np.empty(len(x))
    for s in range(0, len(x), chunk):
        a, b = max(0, s - 64), min(len(x), s + chunk + 64)
        up = np.abs(resample_poly(x[a:b], 4, 1, axis=0)).max(axis=1).reshape(-1, 4).max(axis=1)
        out[s:min(len(x), s + chunk)] = up[s - a:s - a + min(chunk, len(x) - s)]
    return out


def limit(x, ceiling, release=0.08, block=48):
    n = len(x)
    need = np.minimum(1.0, ceiling / np.maximum(true_peak(x), 1e-9))
    k = int(np.ceil(n / block)) + 1
    padded = np.concatenate([need, np.ones(k * block - n)])
    blocks = padded.reshape(k, block).min(axis=1)
    ctrl = np.minimum(blocks, np.concatenate([[1.0], blocks[:-1]]))
    ctrl = np.minimum(ctrl, np.concatenate([blocks[1:], [1.0]]))
    r = np.exp(-block / (release * SR))
    cur = 1.0
    for i in range(k):
        v = ctrl[i]
        cur = v if v < cur else r * cur + (1 - r) * v
        ctrl[i] = cur
    gain = np.interp(np.arange(n), np.arange(k) * block, ctrl)
    return x * gain[:, None]


def lufs(x):
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y, axis=0)
    block, hop = int(0.4 * SR), int(0.1 * SR)
    if len(y) < block:
        return -70.0
    c = np.concatenate([np.zeros((1, y.shape[1])), np.cumsum(y ** 2, axis=0)])
    starts = np.arange(0, len(y) - block + 1, hop)
    ms = ((c[starts + block] - c[starts]) / block).sum(axis=1)
    loud = -0.691 + 10 * np.log10(ms + 1e-20)
    kept = ms[loud > -70]
    if not len(kept):
        return -70.0
    rel = -0.691 + 10 * np.log10(kept.mean()) - 10
    kept = ms[(loud > -70) & (loud > rel)]
    return float(-0.691 + 10 * np.log10(kept.mean()))


def rms_db(x, gate=-50.0):
    m = x.mean(axis=1) if x.ndim == 2 else x
    w = int(0.4 * SR)
    if len(m) < w:
        return -120.0
    k = len(m) // w
    blocks = np.sqrt((m[: k * w].reshape(k, w) ** 2).mean(axis=1) + 1e-20)
    db = 20 * np.log10(blocks)
    live = db[db > gate]
    if len(live) == 0:
        return -120.0
    return float(10 * np.log10(np.mean(10 ** (live / 10))))
