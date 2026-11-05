/**
 * Music and wake-up sounds, synthesised in code: soft instruments made from
 * a few sine partials, playing original tunes (and "Twinkle, Twinkle",
 * a traditional public-domain melody, on the music box).
 *
 * Each piece is exactly one loop long; notes that ring past the end wrap
 * round to the start, so the loop is seamless. Generated at build time by
 * scripts/generate-noise.ts. Original work: no licence needed.
 */
import {
  addEvent,
  fadeIn,
  highpass,
  hz,
  lowpass,
  mix,
  pinkNoise,
  type Random,
  TAU,
  tuned,
} from './synth.ts';

export type Instrument = {
  /** Partials: frequency ratio, level, and decay time in seconds (Infinity holds). */
  partials: [ratio: number, level: number, decay: number][];
  attack: number;
  release: number;
  /** Held notes sustain until their length is up; plucked ones ring and fade by themselves. */
  held: boolean;
  /** Piano-like stretch of the upper partials. */
  inharmonicity?: number;
};

export const INSTRUMENTS = {
  /** A warm, felt-muted tone for the lullaby tune. */
  felt: {
    partials: [
      [1, 1, 6],
      [2, 0.16, 1.6],
      [3, 0.05, 0.8],
    ],
    attack: 0.06,
    release: 0.6,
    held: true,
  },
  /** Soft sustained chords under the lullaby. */
  pad: {
    partials: [
      [1, 1, 10],
      [2, 0.12, 4],
    ],
    attack: 0.5,
    release: 1.2,
    held: true,
  },
  /** Music box tines: a clear tone with quickly fading, bell-like overtones. */
  musicBox: {
    partials: [
      [1, 1, 1.6],
      [3, 0.1, 0.25],
      [5.4, 0.04, 0.1],
      [8.9, 0.015, 0.05],
    ],
    attack: 0.006,
    release: 0.2,
    held: false,
  },
  /** A gentle piano, played softly. */
  piano: {
    partials: [
      [1, 1, 3],
      [2, 0.45, 2],
      [3, 0.22, 1.4],
      [4, 0.12, 1],
      [5, 0.06, 0.7],
      [6, 0.03, 0.5],
    ],
    attack: 0.01,
    release: 0.35,
    held: false,
    inharmonicity: 0.0004,
  },
  /** Harp: plucked strings that ring softly. */
  harp: {
    partials: [
      [1, 1, 2.6],
      [2, 0.35, 1.5],
      [3, 0.14, 0.9],
      [4, 0.06, 0.6],
      [5, 0.025, 0.4],
    ],
    attack: 0.007,
    release: 0.6,
    held: false,
  },
  /** A soft wooden mallet, for the playful wake-up tune. */
  marimba: {
    partials: [
      [1, 1, 0.7],
      [3.9, 0.18, 0.12],
      [9.2, 0.03, 0.04],
    ],
    attack: 0.006,
    release: 0.15,
    held: false,
  },
} satisfies Record<string, Instrument>;

/** Plays one note into the loop. Times are in seconds. */
export function playNote(
  out: Float32Array,
  fs: number,
  start: number,
  note: string | number,
  length: number,
  instrument: Instrument,
  velocity = 1,
): void {
  const f0 = typeof note === 'number' ? note : hz(note);
  const longest = Math.max(...instrument.partials.map(([, , d]) => (Number.isFinite(d) ? d : 4)));
  const ringOut = instrument.held ? length + instrument.release : Math.max(length, longest * 4);
  const total = Math.round(Math.min(ringOut, 8) * fs);
  const attack = Math.round(instrument.attack * fs);
  const releaseAt = Math.round(length * fs);
  const release = Math.round(instrument.release * fs);
  const partials = instrument.partials
    .map(([ratio, level, decay]) => {
      const stretch = instrument.inharmonicity
        ? Math.sqrt(1 + instrument.inharmonicity * ratio * ratio)
        : 1;
      return { f: f0 * ratio * stretch, level, decay };
    })
    .filter((p) => p.f < fs * 0.45);

  addEvent(out, start * fs, total, (k) => {
    const t = k / fs;
    let env = fadeIn(k, attack) * velocity;
    if (k > releaseAt) env *= k - releaseAt >= release ? 0 : 1 - fadeIn(k - releaseAt, release);
    // Fade the very end of a long ring so it never cuts off.
    if (k > total - release) env *= Math.max(0, (total - k) / release);
    if (env === 0) return 0;
    let v = 0;
    for (const p of partials) {
      v += p.level * Math.exp(-t / p.decay) * Math.sin(TAU * p.f * t);
    }
    return env * v;
  });
}

type Note = [note: string | null, beats: number];

/** Plays a line of [note, beats] (null = rest) from beat 0. */
function playLine(
  out: Float32Array,
  fs: number,
  beat: number,
  line: Note[],
  instrument: Instrument,
  velocity: number,
  legato = 0.95,
): number {
  let at = 0;
  for (const [note, beats] of line) {
    if (note) playNote(out, fs, at * beat, note, beats * beat * legato, instrument, velocity);
    at += beats;
  }
  return at;
}

/** The loop length (seconds) a piece needs. */
export const PIECES = {
  /** 8 bars of 3/4 at 60 beats a minute. */
  lullaby: { seconds: 24 },
  /** "Twinkle, Twinkle": 48 beats at 0.56 s. */
  musicBox: { seconds: 48 * 0.56 },
  /** 8 bars of 4/4 at 64 beats a minute. */
  piano: { seconds: 8 * 4 * (60 / 64) },
  /** 8 bars of 4/4 at 60 beats a minute. */
  harp: { seconds: 32 },
  /** 8 bars of 4/4 at 100 beats a minute. */
  playful: { seconds: 8 * 4 * 0.6 },
};

/** Soft lullaby: an original, gentle tune in 3/4 over warm chords. */
export function lullaby(fs: number, n: number): Float32Array {
  const beat = 1;
  const melody = new Float32Array(n);
  playLine(
    melody,
    fs,
    beat,
    [
      ['G4', 2],
      ['E4', 1],
      ['E4', 1],
      ['A4', 1],
      ['G4', 1],
      ['F4', 2],
      ['A4', 1],
      ['G4', 3],
      ['G4', 2],
      ['C5', 1],
      ['A4', 2],
      ['E4', 1],
      ['F4', 1],
      ['E4', 1],
      ['D4', 1],
      ['C4', 3],
    ],
    INSTRUMENTS.felt,
    0.8,
  );
  const chords = new Float32Array(n);
  const progression = [
    ['C3', 'G3', 'E4'],
    ['A2', 'E3', 'C4'],
    ['F2', 'C3', 'A3'],
    ['G2', 'D3', 'B3'],
    ['C3', 'G3', 'E4'],
    ['A2', 'E3', 'C4'],
    ['D3', 'A3', 'F4'],
    ['C3', 'G3', 'E4'],
  ];
  progression.forEach((chord, bar) => {
    for (const note of chord)
      playNote(chords, fs, bar * 3 * beat, note, 3 * beat, INSTRUMENTS.pad, 0.22);
  });
  return lowpass(mix([melody, 1], [chords, 1]), fs, 3500);
}

/** "Twinkle, Twinkle" on a music box, with soft low tines on the chords. */
export function musicBox(fs: number, n: number): Float32Array {
  const beat = 0.56;
  const tune: [string, number][] = [
    ['C5', 1],
    ['C5', 1],
    ['G5', 1],
    ['G5', 1],
    ['A5', 1],
    ['A5', 1],
    ['G5', 2],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 1],
    ['D5', 1],
    ['C5', 2],
    ['G5', 1],
    ['G5', 1],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 2],
    ['G5', 1],
    ['G5', 1],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 2],
    ['C5', 1],
    ['C5', 1],
    ['G5', 1],
    ['G5', 1],
    ['A5', 1],
    ['A5', 1],
    ['G5', 2],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 1],
    ['D5', 1],
    ['C5', 2],
  ];
  const out = new Float32Array(n);
  playLine(out, fs, beat, tune, INSTRUMENTS.musicBox, 0.9);
  // One low tine every two beats, following the harmony.
  const bass = ['C4', 'C4', 'F4', 'C4', 'F4', 'C4', 'G4', 'C4', 'C4', 'F4', 'C4', 'G4'];
  const lows = [...bass, 'C4', 'F4', 'C4', 'G4', ...bass.slice(0, 8)];
  lows.forEach((note, k) =>
    playNote(out, fs, k * 2 * beat, note, 2 * beat, INSTRUMENTS.musicBox, 0.45),
  );
  return lowpass(out, fs, 7000);
}

/** Soft piano: slow broken chords with a quiet melody on top (original). */
export function piano(fs: number, n: number): Float32Array {
  const beat = 60 / 64;
  const out = new Float32Array(n);
  const bars: [string, string, string, string][] = [
    // root, fifth, third (an octave up), top melody note
    ['C3', 'G3', 'E4', 'E5'],
    ['A2', 'E3', 'C4', 'C5'],
    ['F2', 'C3', 'A3', 'A4'],
    ['G2', 'D3', 'B3', 'B4'],
    ['C3', 'G3', 'E4', 'G4'],
    ['E2', 'B2', 'G3', 'B4'],
    ['F2', 'C3', 'A3', 'C5'],
    ['G2', 'D3', 'B3', 'D5'],
  ];
  bars.forEach(([root, fifth, third, top], bar) => {
    const t0 = bar * 4 * beat;
    const octave = root.replace(/\d$/, (d) => String(Number(d) + 1));
    const pattern = [root, fifth, octave, third, fifth, third, octave, fifth];
    pattern.forEach((note, k) => {
      playNote(out, fs, t0 + k * 0.5 * beat, note, 1.8 * beat, INSTRUMENTS.piano, 0.32);
    });
    playNote(out, fs, t0, top, 3.6 * beat, INSTRUMENTS.piano, 0.4);
  });
  return lowpass(out, fs, 4000);
}

/** Gentle harp: rising arpeggios over a slow progression (original). */
export function harp(fs: number, n: number): Float32Array {
  const beat = 1;
  const out = new Float32Array(n);
  const chords: string[][] = [
    ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4', 'C5'],
    ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'Bb4', 'D5', 'F5'],
    ['D2', 'A2', 'D3', 'F3', 'A3', 'D4', 'F4', 'A4'],
    ['C2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4'],
    ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4', 'C5'],
    ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'Bb4', 'D5', 'F5'],
    ['C2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4'],
    ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4', 'C5'],
  ];
  chords.forEach((notes, bar) => {
    notes.forEach((note, k) => {
      playNote(out, fs, bar * 4 * beat + k * 0.5 * beat, note, 3 * beat, INSTRUMENTS.harp, 0.35);
    });
  });
  return lowpass(out, fs, 5000);
}

/** Playful soft melody for waking up: a bouncy, original tune on soft mallets. */
export function playful(fs: number, n: number): Float32Array {
  const beat = 0.6;
  const out = new Float32Array(n);
  playLine(
    out,
    fs,
    beat,
    [
      ['C5', 0.5],
      ['E5', 0.5],
      ['G5', 1],
      ['E5', 1],
      ['G5', 1],
      ['A5', 0.5],
      ['G5', 0.5],
      ['F5', 1],
      ['A5', 1],
      ['F5', 1],
      ['G5', 0.5],
      ['F5', 0.5],
      ['E5', 1],
      ['D5', 1],
      ['G4', 1],
      ['C5', 1],
      ['E5', 1],
      ['C5', 2],
      ['E5', 0.5],
      ['G5', 0.5],
      ['A5', 1],
      ['G5', 1],
      ['E5', 1],
      ['F5', 0.5],
      ['A5', 0.5],
      ['G5', 1],
      ['F5', 1],
      ['D5', 1],
      ['D5', 0.5],
      ['E5', 0.5],
      ['F5', 1],
      ['D5', 1],
      ['B4', 1],
      ['C5', 2],
      ['G4', 1],
      [null, 1],
    ],
    INSTRUMENTS.marimba,
    0.7,
  );
  const bass = [
    'C3',
    'G3',
    'F3',
    'C4',
    'G3',
    'D3',
    'C3',
    'G3',
    'C3',
    'G3',
    'F3',
    'C4',
    'G3',
    'D3',
    'C3',
    'G2',
  ];
  bass.forEach((note, k) =>
    playNote(out, fs, k * 2 * beat, note, 2 * beat, INSTRUMENTS.marimba, 0.4),
  );
  return lowpass(out, fs, 5000);
}

/** One bird call: a smooth sweep of pitch with a soft envelope. */
function chirp(
  out: Float32Array,
  fs: number,
  at: number,
  seconds: number,
  from: number,
  to: number,
  amp: number,
): void {
  const len = Math.round(seconds * fs);
  let phase = 0;
  addEvent(out, at, len, (k) => {
    const t = k / len;
    const f = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    phase += (TAU * f) / fs;
    return amp * Math.sin(Math.PI * t) ** 2 * Math.sin(phase);
  });
}

/** Morning birds: three gentle birds calling back and forth over soft morning air. */
export function morningBirds(fs: number, n: number, random: Random): Float32Array {
  const birds = new Float32Array(n);
  const seconds = n / fs;
  const calls: ((at: number, amp: number) => void)[] = [
    // A two-note "cheer-up" whistle.
    (at, amp) => {
      chirp(birds, fs, at, 0.2, 2900, 2700, amp);
      chirp(birds, fs, at + 0.27 * fs, 0.17, 3300, 3150, amp * 0.9);
    },
    // A quick, soft trill.
    (at, amp) => {
      for (let k = 0; k < 6; k++)
        chirp(birds, fs, at + k * 0.06 * fs, 0.035, 3700, 3200, amp * 0.7);
    },
    // Three little rising tweets.
    (at, amp) => {
      for (let k = 0; k < 3; k++) chirp(birds, fs, at + k * 0.14 * fs, 0.08, 2400, 3500, amp * 0.8);
    },
    // A long, falling whistle.
    (at, amp) => chirp(birds, fs, at, 0.45, 3400, 2500, amp),
  ];
  const count = Math.round(seconds * 0.9);
  for (let c = 0; c < count; c++) {
    const call = calls[Math.floor(random() * calls.length)];
    call(random() * n, 0.35 + random() * 0.65);
  }
  const air = lowpass(highpass(pinkNoise(n, random), fs, 900), fs, 4000);
  return mix([lowpass(birds, fs, 4500), 1], [air, 0.12]);
}

// ---- Harmony Tones: 432 Hz lullabies ----
// Slow (60–72 beats a minute), simple, steady and in a major key. Tuned to
// A = 432 Hz: every note is 432/440 of its usual pitch (about a third of a
// semitone lower).

const A432 = 432;

/** A softer music box: the overtones are quieter and fade sooner. */
const softMusicBox: Instrument = {
  partials: [
    [1, 1, 1.8],
    [3, 0.06, 0.22],
    [5.4, 0.015, 0.08],
  ],
  attack: 0.012,
  release: 0.25,
  held: false,
};

/** A softer piano for the slow lullaby: fewer bright partials, a gentler touch. */
const softPiano: Instrument = {
  partials: [
    [1, 1, 3.2],
    [2, 0.35, 2],
    [3, 0.12, 1.3],
    [4, 0.04, 0.8],
  ],
  attack: 0.016,
  release: 0.5,
  held: false,
  inharmonicity: 0.0003,
};

export const PIECES_432 = {
  /** "Twinkle, Twinkle": 48 beats at 72 beats a minute. */
  musicBox: { seconds: 48 * (60 / 72) },
  /** 8 bars of 4/4 at 60 beats a minute. */
  piano: { seconds: 32 },
};

/** Music Box · 432 Hz: "Twinkle, Twinkle" (traditional), slow and soft, at A=432. */
export function musicBox432(fs: number, n: number): Float32Array {
  const beat = 60 / 72;
  const tune: [string, number][] = [
    ['C5', 1],
    ['C5', 1],
    ['G5', 1],
    ['G5', 1],
    ['A5', 1],
    ['A5', 1],
    ['G5', 2],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 1],
    ['D5', 1],
    ['C5', 2],
    ['G5', 1],
    ['G5', 1],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 2],
    ['G5', 1],
    ['G5', 1],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 2],
    ['C5', 1],
    ['C5', 1],
    ['G5', 1],
    ['G5', 1],
    ['A5', 1],
    ['A5', 1],
    ['G5', 2],
    ['F5', 1],
    ['F5', 1],
    ['E5', 1],
    ['E5', 1],
    ['D5', 1],
    ['D5', 1],
    ['C5', 2],
  ];
  const out = new Float32Array(n);
  let at = 0;
  for (const [note, beats] of tune) {
    playNote(out, fs, at * beat, tuned(note, A432), beats * beat, softMusicBox, 0.75);
    at += beats;
  }
  // One low tine every two beats, following the harmony.
  const lows = [
    'C4',
    'C4',
    'F4',
    'C4',
    'F4',
    'C4',
    'G4',
    'C4',
    'C4',
    'F4',
    'C4',
    'G4',
    'C4',
    'F4',
    'C4',
    'G4',
    'C4',
    'C4',
    'F4',
    'C4',
    'F4',
    'C4',
    'G4',
    'C4',
  ];
  lows.forEach((note, k) =>
    playNote(out, fs, k * 2 * beat, tuned(note, A432), 2 * beat, softMusicBox, 0.35),
  );
  return lowpass(out, fs, 3500, 2);
}

/** Slow Piano · 432 Hz: an original, simple tune at 60 beats a minute, at A=432. */
export function slowPiano432(fs: number, n: number): Float32Array {
  const beat = 1;
  const out = new Float32Array(n);
  // [chord: root, then the two notes played together on beat 3], melody
  const bars: [string, [string, string], [string, number][]][] = [
    [
      'F2',
      ['A3', 'C4'],
      [
        ['A4', 2],
        ['C5', 2],
      ],
    ],
    [
      'D3',
      ['F3', 'A3'],
      [
        ['D5', 2],
        ['C5', 2],
      ],
    ],
    [
      'Bb2',
      ['D3', 'F3'],
      [
        ['Bb4', 2],
        ['D5', 2],
      ],
    ],
    ['C3', ['E3', 'G3'], [['C5', 4]]],
    [
      'F2',
      ['A3', 'C4'],
      [
        ['A4', 2],
        ['C5', 2],
      ],
    ],
    [
      'A2',
      ['C3', 'E3'],
      [
        ['E5', 2],
        ['C5', 2],
      ],
    ],
    [
      'Bb2',
      ['D3', 'F3'],
      [
        ['D5', 2],
        ['Bb4', 2],
      ],
    ],
    [
      'C3',
      ['E3', 'G3'],
      [
        ['C5', 2],
        ['G4', 2],
      ],
    ],
  ];
  bars.forEach(([root, [a, b], melody], bar) => {
    const t0 = bar * 4 * beat;
    playNote(out, fs, t0, tuned(root, A432), 3.8 * beat, softPiano, 0.28);
    playNote(out, fs, t0 + 2 * beat, tuned(a, A432), 1.9 * beat, softPiano, 0.18);
    playNote(out, fs, t0 + 2 * beat, tuned(b, A432), 1.9 * beat, softPiano, 0.18);
    let at = 0;
    for (const [note, beats] of melody) {
      playNote(out, fs, t0 + at * beat, tuned(note, A432), beats * beat * 0.95, softPiano, 0.34);
      at += beats;
    }
  });
  return lowpass(out, fs, 2500, 2);
}
