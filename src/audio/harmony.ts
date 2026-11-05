/**
 * Harmony Tones: soft, steady tones at named frequencies (174, 396, 528,
 * 639 Hz) and a low hummed drone (136.1 Hz), synthesised in code.
 *
 * Every tone is softened, never a bare sine: a few quiet harmonics, three
 * slightly detuned voices for warmth, a slow 10-second swell, a low-pass
 * around 2.5 kHz, and a quiet texture underneath. The voices drift against
 * each other at 0.2 Hz or slower: a gentle shimmer, not a pulse. Files are
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
/** The texture sits about 18 dB under the tone. */
const BED_GAIN = 10 ** (-18 / 20);

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

/** The slow swell: 72% to 100% and back, three times per loop. */
function swell(n: number, depth = 0.28): (i: number) => number {
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
  [2, 0.32],
  [3, 0.12],
  [4, 0.05],
];

// Detunes make whole cycles in 30 s: 0.1 Hz = 3 cycles, 0.1333 Hz = 4.
const DETUNE = [0.1, 4 / 30] as const;
/** The quiet side voices, relative to the main one. */
const SIDE_VOICE = 0.15;

/** Deep Calm · 174 Hz: a warm, low drone over a soft brown-noise bed. */
export function harmony174(fs: number, n: number, random: Random): Float32Array {
  const tone = warmTone(
    fs,
    n,
    174,
    [
      [0.5, 0.12],
      [1, 1],
      [2, 0.6],
      [3, 0.32],
      [4, 0.14],
      [5, 0.06],
    ],
    DETUNE,
    random,
  );
  const shaped = lowpass(multiply(tone, swell(n)), fs, 2200, 2);
  const bed = lowpass(brownNoise(n, random), fs, 600);
  return withBed(shaped, bed);
}

/** Gentle Release · 396 Hz: a soft major chord built on 396 Hz, with light wind. */
export function harmony396(fs: number, n: number, random: Random): Float32Array {
  // 396 with its major third (495) and fifth (594), and the octave below.
  const chord = mix(
    [warmTone(fs, n, 396, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 198, SOFT_PARTIALS, DETUNE, random), 0.45],
    [warmTone(fs, n, 495, SOFT_PARTIALS, DETUNE, random), 0.35],
    [warmTone(fs, n, 594, SOFT_PARTIALS, DETUNE, random), 0.3],
  );
  const shaped = lowpass(multiply(chord, swell(n)), fs, 2500, 2);
  return withBed(shaped, wind(fs, n, random));
}

/** Heart Tone · 528 Hz: a slowly swelling pad, softened, over a faint ocean. */
export function harmony528(fs: number, n: number, random: Random): Float32Array {
  const pad = mix(
    [warmTone(fs, n, 528, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 264, SOFT_PARTIALS, DETUNE, random), 0.55],
    [warmTone(fs, n, 792, SOFT_PARTIALS, DETUNE, random), 0.22],
  );
  // A deeper swell for this one: "slow-swelling" is its character.
  const shaped = lowpass(multiply(pad, swell(n, 0.34)), fs, 2400, 2);
  return withBed(shaped, ocean(fs, n, random));
}

/** Together · 639 Hz: a warm pad with very sparse, distant chimes tuned to it. */
export function harmony639(fs: number, n: number, random: Random): Float32Array {
  const pad = mix(
    [warmTone(fs, n, 639, SOFT_PARTIALS, DETUNE, random), 1],
    [warmTone(fs, n, 319.5, SOFT_PARTIALS, DETUNE, random), 0.5],
  );
  const shaped = lowpass(multiply(pad, swell(n)), fs, 2500, 2);

  // Chimes on notes that agree with 639 Hz (its octave, fifth and major
  // third), one every 7–8 seconds, far away and soft.
  const chimes = new Float32Array(n);
  const notes = [639, 958.5, 1278, 798.75];
  const count = 4;
  for (let c = 0; c < count; c++) {
    const f = notes[c % notes.length];
    const at = ((c + 0.3 + random() * 0.4) / count) * n;
    const len = Math.round(6 * fs);
    const attack = Math.round(0.02 * fs);
    addEvent(chimes, at, len, (k) => {
      const t = k / fs;
      const env = fadeIn(k, attack) * Math.exp(-t / 1.6) * (k > len - fs ? (len - k) / fs : 1);
      return (
        env * (Math.sin(TAU * f * t) + 0.18 * Math.exp(-t / 0.4) * Math.sin(TAU * 2.76 * f * t))
      );
    });
  }
  // Chimes sit a little above the usual bed: they are part of this sound.
  return mix([unit(shaped), 1], [unit(lowpass(chimes, fs, 3000)), 0.3]);
}

/**
 * Om Drone · 136.1 Hz: a low, hummed tone. A buzzy voice-like source
 * (many harmonics) shaped by "o" and "m" formants, layered with a softer
 * voice an octave up.
 */
export function omDrone(fs: number, n: number, random: Random): Float32Array {
  const f0 = 136.1;
  const harmonics: Partial[] = [];
  for (let h = 1; h * f0 < 3200; h++) harmonics.push([h, 1 / h ** 1.15]);
  const voice = mix(
    [warmTone(fs, n, f0, harmonics, DETUNE, random), 1],
    [warmTone(fs, n, f0 * 2, harmonics.slice(0, 10), DETUNE, random), 0.6],
  );
  // The hum ("m") is mostly the low end; the "o" adds formants near 500 and 850 Hz.
  const hum = mix(
    [lowpass(voice, fs, 380, 2), 0.35],
    [bandpass(voice, fs, 500, 4), 1],
    [bandpass(voice, fs, 850, 5), 0.5],
    [bandpass(voice, fs, 2600, 6), 0.06],
  );
  const shaped = lowpass(multiply(hum, swell(n, 0.22)), fs, 2500, 2);
  return withBed(shaped, lowpass(brownNoise(n, random), fs, 500));
}
