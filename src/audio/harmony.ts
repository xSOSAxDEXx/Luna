/**
 * Harmony Tones: soft, steady tones at named frequencies (174, 396, 528,
 * 639 Hz) and a low hummed drone (136.1 Hz), synthesised in code.
 *
 * Every tone is softened, never a bare sine: a few quiet harmonics, two
 * faint detuned voices for warmth (drifting over 15–30 s, never beating), a
 * very shallow 10-second swell, a low-pass around 1.4–1.6 kHz, and a
 * texture far underneath. Files are
 * mono, so there are no binaural effects.
 *
 * Loops are 30 s. Every frequency used completes a whole number of cycles
 * in that time (frequency × 30 is a whole number), and the swell repeats
 * exactly three times, so the loop point is seamless without a crossfade.
 *
 * Generated at build time by scripts/generate-harmony.ts. Original work.
 */
import {
  brownNoise,
  lowpass,
  bandpass,
  mix,
  multiply,
  type Random,
  TAU,
  addEvent,
  fadeIn,
} from './synth.ts';
import { ocean, wind } from './soundscapes.ts';

export const HARMONY_SECONDS = 30;
/** One slow swell, in seconds: about the pace of a calm breath in and out. */
export const SWELL_SECONDS = 10;
/** The texture sits about 24 dB under the tone: there, but far in the background. */
const BED_GAIN = 10 ** (-24 / 20);

/** [ratio to the fundamental, level] */
type Partial = [number, number];

/**
 * A warm tone: the given partials, each played by a main voice and two quiet
 * ones detuned by `detune[0]` and `detune[1]` Hz. Uneven detuning and quiet
 * side voices give warmth without the voices cancelling into a pulse.
 * Each detune × loop length must be a whole number.
 */
function warmTone(
  fs: number,
  n: number,
  fundamental: number,
  partials: Partial[],
  detune: readonly [number, number],
  random: Random,
): Float32Array {
  const out = new Float32Array(n);
  const voices: [number, number][] = [
    [0, 1],
    [-detune[0], SIDE_VOICE],
    [detune[1], SIDE_VOICE],
  ];
  for (const [ratio, level] of partials) {
    for (const [v, g] of voices) {
      const f = ratio * (fundamental + v);
      const phase = random() * TAU;
      const step = (TAU * f) / fs;
      const gain = level * g;
      for (let i = 0; i < n; i++) out[i] += gain * Math.sin(phase + step * i);
    }
  }
  return out;
}

/** The slow swell: 88% to 100% and back, three times per loop. Barely there. */
function swell(n: number, depth = 0.12): (i: number) => number {
  const cycles = HARMONY_SECONDS / SWELL_SECONDS;
  return (i) => 1 - depth + depth * (0.5 - 0.5 * Math.cos((TAU * cycles * i) / n));
}

function unit(x: Float32Array): Float32Array {
  let sum = 0;
  for (const v of x) sum += v * v;
  const r = Math.sqrt(sum / x.length) || 1;
  return x.map((v) => v / r);
}

/** Tone plus a texture bed about 18 dB below it. */
function withBed(tone: Float32Array, bed: Float32Array): Float32Array {
  return mix([unit(tone), 1], [unit(bed), BED_GAIN]);
}

const SOFT_PARTIALS: Partial[] = [
  [1, 1],
  [2, 0.22],
  [3, 0.05],
];

// Detunes make whole cycles in 30 s: 1/30 Hz = 1 cycle, 2/30 Hz = 2. So
// slow that the voices drift rather than beat.
const DETUNE = [1 / 30, 2 / 30] as const;
/** The quiet side voices, relative to the main one. */
const SIDE_VOICE = 0.07;

/** Deep Calm · 174 Hz: a warm, low drone over a soft brown-noise bed. */
export function harmony174(fs: number, n: number, random: Random): Float32Array {
  const tone = warmTone(
    fs,
    n,
    174,
    [
      [0.5, 0.08],
      [1, 1],
      [2, 0.45],
      [3, 0.16],
      [4, 0.05],
    ],
    DETUNE,
    random,
  );
  const shaped = lowpass(multiply(tone, swell(n)), fs, 1400, 2);
  const bed = lowpass(brownNoise(n, random), fs, 600);
  return withBed(shaped, bed);
}

/** Gentle Release · 396 Hz: a soft, open chord built on 396 Hz, with light wind. */
export function harmony396(fs: number, n: number, random: Random): Float32Array {
  // 396 with its fifth (594) and the octave below: open and simple.
  const chord = mix(
    [warmTone(fs, n, 396, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 198, SOFT_PARTIALS, DETUNE, random), 0.4],
    [warmTone(fs, n, 594, SOFT_PARTIALS, DETUNE, random), 0.18],
  );
  const shaped = lowpass(multiply(chord, swell(n)), fs, 1500, 2);
  return withBed(shaped, wind(fs, n, random));
}

/** Heart Tone · 528 Hz: a slowly swelling pad, softened, over a faint ocean. */
export function harmony528(fs: number, n: number, random: Random): Float32Array {
  const pad = mix(
    [warmTone(fs, n, 528, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 264, SOFT_PARTIALS, DETUNE, random), 0.5],
  );
  // A little more swell for this one: "slow-swelling" is its character.
  const shaped = lowpass(multiply(pad, swell(n, 0.18)), fs, 1500, 2);
  return withBed(shaped, ocean(fs, n, random));
}

/** Together · 639 Hz: a warm pad with very sparse, distant chimes tuned to it. */
export function harmony639(fs: number, n: number, random: Random): Float32Array {
  const pad = mix(
    [warmTone(fs, n, 639, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 319.5, SOFT_PARTIALS, DETUNE, random), 0.5],
  );
  const shaped = lowpass(multiply(pad, swell(n)), fs, 1600, 2);

  // Two chimes per loop, on notes that agree with 639 Hz (its octave and
  // fifth), far away and soft.
  const chimes = new Float32Array(n);
  const notes = [958.5, 1278];
  const count = 2;
  for (let c = 0; c < count; c++) {
    const f = notes[c % notes.length];
    const at = ((c + 0.3 + random() * 0.4) / count) * n;
    const len = Math.round(6 * fs);
    const attack = Math.round(0.04 * fs);
    addEvent(chimes, at, len, (k) => {
      const t = k / fs;
      const env = fadeIn(k, attack) * Math.exp(-t / 1.6) * (k > len - fs ? (len - k) / fs : 1);
      return env * (Math.sin(TAU * f * t) + 0.08 * Math.exp(-t / 0.4) * Math.sin(TAU * 2 * f * t));
    });
  }
  // Chimes sit a little above the usual bed: they are part of this sound.
  return mix([unit(shaped), 1], [unit(lowpass(chimes, fs, 2000)), 0.15]);
}

/**
 * Om Drone · 136.1 Hz: a low, hummed tone. A voice-like source (a gently
 * falling series of harmonics) shaped by soft "o" and "m" formants, with a
 * quieter voice an octave up.
 */
export function omDrone(fs: number, n: number, random: Random): Float32Array {
  const f0 = 136.1;
  const harmonics: Partial[] = [];
  for (let h = 1; h * f0 < 1700; h++) harmonics.push([h, 1 / h ** 1.6]);
  const voice = mix(
    [warmTone(fs, n, f0, harmonics, DETUNE, random), 1],
    [warmTone(fs, n, f0 * 2, harmonics.slice(0, 5), DETUNE, random), 0.4],
  );
  // The hum ("m") is mostly the low end; the "o" adds formants near 500 and 850 Hz.
  const hum = mix(
    [lowpass(voice, fs, 380, 2), 0.35],
    [bandpass(voice, fs, 480, 3), 0.8],
    [bandpass(voice, fs, 820, 4), 0.25],
  );
  const shaped = lowpass(multiply(hum, swell(n, 0.1)), fs, 1400, 2);
  return withBed(shaped, lowpass(brownNoise(n, random), fs, 500));
}

/** Singing bowl loops are a little longer: three strikes about 12 s apart. */
export const BOWL_SECONDS = 36;

/**
 * Singing Bowl: a soft-struck bowl that rings and fades slowly, three
 * strikes per loop. Built from a bowl's uneven (inharmonic) overtones, each
 * fading at its own pace, with the high ones quiet and quick to fade. The
 * main note is 216 Hz (A at A=432 tuning). A padded mallet: each strike
 * swells in over about 70 ms instead of clicking. A real bowl's slow
 * "warble" is kept to a faint shimmer (about 1 dB), so it never pulses.
 */
export function singingBowl(fs: number, n: number, random: Random): Float32Array {
  const f0 = 216;
  // [ratio, level, decay in seconds]
  const modes: [number, number, number][] = [
    [1, 1, 10],
    [2.71, 0.38, 4.5],
    [5.18, 0.06, 2],
    [8.21, 0.015, 1],
  ];
  const strikes = 3;
  const out = new Float32Array(n);
  const ring = Math.round(Math.min(n, 30 * fs));
  const attack = Math.round(0.07 * fs);
  for (let s = 0; s < strikes; s++) {
    const at = ((s + (random() - 0.5) * 0.1) / strikes) * n;
    const velocity = [1, 0.82, 0.9][s % 3];
    const phases = modes.map(() => random() * TAU);
    addEvent(out, at, ring, (k) => {
      const t = k / fs;
      // The last second of the ring fades to nothing (it's tiny by then anyway).
      const tail = k > ring - fs ? (ring - k) / fs : 1;
      let v = 0;
      modes.forEach(([ratio, level, decay], m) => {
        const f = f0 * ratio;
        v += level * Math.exp(-t / decay) * Math.sin(phases[m] + TAU * f * t);
        // The faint warble: a second, slightly sharper copy of the main note.
        if (m === 0) v += 0.06 * Math.exp(-t / decay) * Math.sin(TAU * (f + 0.35) * t);
      });
      return velocity * fadeIn(k, attack) * tail * v;
    });
  }
  return lowpass(out, fs, 2000, 2);
}
