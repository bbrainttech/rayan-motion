STYLES = {
    'glass': {
        'about': 'Bright FM bells in a 3-3-2 rhythm, airy pads, a felt kick and shaker in half time. Product explainers, walkthroughs, launches that should feel calm and clever.',
        'bpm': 104,
        'key': 'Ab',
        'minor': False,
        'bars_per_chord': 1,
        'chords': [[0, 'maj9'], [9, 'm9'], [5, 'maj9#11'], [7, '9sus4']],
        'final': [0, '69'],
        'room': {'seconds': 3.2, 'tau': 0.62, 'bright': 7200, 'wet': 0.42},
    },
    'pulse': {
        'about': 'A rolling 16th saw bass, claps on two and four, offbeat chord stabs and snare-roll builds. Teasers, launch trailers, anything fast.',
        'bpm': 124,
        'key': 'F',
        'minor': True,
        'bars_per_chord': 1,
        'chords': [[0, 'm9'], [8, 'maj9'], [3, 'add9'], [10, '69']],
        'final': [0, 'm9'],
        'room': {'seconds': 1.9, 'tau': 0.34, 'bright': 6200, 'wet': 0.3},
    },
    'lofi': {
        'about': 'Swung tine piano chords, a plucked upright bass, dusty drums, tape wobble and vinyl crackle. Showcases, tutorials, relaxed product tours.',
        'bpm': 82,
        'key': 'Eb',
        'minor': False,
        'swing': 0.58,
        'bars_per_chord': 1,
        'chords': [[2, 'm9'], [7, '13'], [0, 'maj9'], [9, 'm9']],
        'final': [0, 'maj9'],
        'room': {'seconds': 1.3, 'tau': 0.24, 'bright': 4200, 'wet': 0.32},
    },
    'air': {
        'about': 'A beating drone, slow shimmer pads and seeded high sparkles, no drums. Logo stings, brand films, loops and ambient backgrounds.',
        'bpm': 66,
        'key': 'E',
        'minor': False,
        'bars_per_chord': 2,
        'chords': [[0, 'maj9#11'], [9, 'm9'], [5, 'maj9#11'], [7, 'sus2']],
        'final': [0, 'maj9#11'],
        'room': {'seconds': 5.0, 'tau': 1.1, 'bright': 5200, 'wet': 0.55},
    },
    'none': {
        'about': 'No music. Sound effects and voice only.',
        'bpm': 120,
        'key': 'C',
        'minor': False,
        'bars_per_chord': 1,
        'chords': [[0, 'maj7']],
        'final': [0, 'maj7'],
        'room': {'seconds': 1.6, 'tau': 0.3, 'bright': 6000, 'wet': 0.25},
    },
}

ENDINGS = {
    'ring': 'Rhythm stops on the last bar and the home chord rings out. Explainers, tutorials, anything that closes on a calm final frame.',
    'button': 'Everything lands together on one hit, then silence. Calls to action, teasers, a logo slam.',
    'loop': 'No ending: the tail wraps into the start so the file loops without a seam. Backgrounds, GIF-like clips, hero videos.',
    'fade': 'The music fades over the last two bars. Long pieces, or when the final frame holds still.',
}

GAIN = {
    'tap': 0.18, 'latch': 0.14, 'pop': 0.13, 'snap': 0.12, 'keys': 0.11, 'count': 0.08,
    'swipe': 0.11, 'air': 0.09, 'slide': 0.1, 'glitch': 0.08,
    'ding': 0.09, 'shimmer': 0.07, 'rise': 0.11, 'drop': 0.24,
}

SOUNDS = {
    'tap': 'a soft press on a button or card',
    'latch': 'a toggle or checkbox that locks into place',
    'pop': 'something small appears: a chip, a badge, a dot',
    'snap': 'a number or word lands',
    'keys': 'typing on a mechanical keyboard (dur, n)',
    'count': 'a counter ticking up, slowing as it lands (dur, n)',
    'swipe': 'a scene or panel change; dir up or down (d)',
    'air': 'a soft move: a card drifts, a camera pans (d)',
    'slide': 'a sheet or card slides in and settles (d)',
    'glitch': 'scrambled text, a fast data burst (d)',
    'ding': 'a success, in key (deg, octave)',
    'shimmer': 'a reveal or sparkle, five quick notes in key',
    'rise': 'tension that ends on the cue time (d); goes on the music bus',
    'drop': 'a deep hit for the biggest moment',
}


REVERB = {'ding': 0.5, 'shimmer': 0.6, 'pop': 0.25, 'swipe': 0.3, 'air': 0.2, 'rise': 0.35, 'drop': 0.3, 'slide': 0.15, 'snap': 0.15, 'glitch': 0.05, 'keys': 0.04, 'tap': 0.08, 'latch': 0.06, 'count': 0.1}

QUALITIES = {
    'maj7': [0, 4, 7, 11],
    'maj9': [0, 4, 7, 11, 14],
    'maj9#11': [0, 4, 7, 11, 14, 18],
    'add9': [0, 4, 7, 14],
    '69': [0, 4, 7, 9, 14],
    'm7': [0, 3, 7, 10],
    'm9': [0, 3, 7, 10, 14],
    'm11': [0, 3, 7, 10, 14, 17],
    'madd9': [0, 3, 7, 14],
    '7': [0, 4, 7, 10],
    '13': [0, 4, 10, 14, 21],
    '7sus4': [0, 5, 7, 10],
    '9sus4': [0, 5, 7, 10, 14],
    'sus2': [0, 2, 7, 14],
}

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}

MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]


def tonic(key):
    name = key[:-1] if key.endswith('m') and key[:-1] in NOTE else key
    if name not in NOTE:
        raise SystemExit(f'unknown key {key!r}; use a note name like C, F#, Bb')
    return NOTE[name]
