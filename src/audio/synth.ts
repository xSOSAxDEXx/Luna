/**
 * Small synthesis toolkit for the bundled sounds (scripts/generate-noise.ts).
 *
 * Everything here works on a loop of fixed length and keeps it seamless:
 * - filters run "around the loop" twice, so the output at the end flows
 *   exactly into the start (the input is periodic, so the steady state is);
 * - slow changes use periodic control curves or whole cycles per loop;
 * - one-off events (a raindrop, a note) wrap past the end back to the start.
 *
 * Keep imports relative with `.ts` so Node can run this directly.
 */
import { createRandom } from './noise.ts';

export { createRandom };
export type Random = () => number;
export const TAU = Math.PI * 2;

export function whiteNoise(length: number, random: Random): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = random() * 2 - 1;
  return out;
}

/** Runs a stateful filter around the loop twice and keeps the second pass. */
function aroundTheLoop(input: Float32Array, step: (x: number, i: number) => number): Float32Array {
  const out = new Float32Array(input.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < input.length; i++) out[i] = step(input[i], i);
  }
  return out;
}

/** Pink noise (−3 dB/octave), periodic over the buffer. */
export function pinkNoise(length: number, random: Random): Float32Array {
  const white = whiteNoise(length, random);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  return aroundTheLoop(white, (w) => {
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return y * 0.11;
  });
}

/** Brown noise (−6 dB/octave), periodic over the buffer. */
export function brownNoise(length: number, random: Random): Float32Array {
  const white = whiteNoise(length, random);
  let last = 0;
  const out = aroundTheLoop(white, (w) => {
    last = (last + 0.02 * w) / 1.02;
    return last * 3.5;
  });
  return out;
}

const onePole = (fc: number, sampleRate: number) => 1 - Math.exp((-TAU * fc) / sampleRate);

/**
 * One-pole low-pass. `cutoff` may be a number or a per-sample curve (Hz).
 * `order` repeats it for a steeper slope.
 */
export function lowpass(
  input: Float32Array,
  sampleRate: number,
  cutoff: number | Float32Array,
  order = 1,
): Float32Array {
  let x = input;
  for (let o = 0; o < order; o++) {
    let y = 0;
    const fixed = typeof cutoff === 'number' ? onePole(cutoff, sampleRate) : 0;
    x = aroundTheLoop(x, (v, i) => {
      const a = typeof cutoff === 'number' ? fixed : onePole(cutoff[i], sampleRate);
      y += a * (v - y);
      return y;
    });
  }
  return x;
}

export function highpass(
  input: Float32Array,
  sampleRate: number,
  cutoff: number,
  order = 1,
): Float32Array {
  let x = input;
  for (let o = 0; o < order; o++) {
    const low = lowpass(x, sampleRate, cutoff);
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = x[i] - low[i];
    x = out;
  }
  return x;
}

/**
 * Band-pass biquad (constant 0 dB peak). `center` may be a per-sample curve,
 * for sweeping sounds like wind.
 */
export function bandpass(
  input: Float32Array,
  sampleRate: number,
  center: number | Float32Array,
  q: number,
): Float32Array {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  let b0 = 0,
    b2 = 0,
    a1 = 0,
    a2 = 0;
  const design = (fc: number) => {
    const w = (TAU * Math.min(fc, sampleRate * 0.45)) / sampleRate;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    b0 = alpha / a0;
    b2 = -alpha / a0;
    a1 = (-2 * Math.cos(w)) / a0;
    a2 = (1 - alpha) / a0;
  };
  if (typeof center === 'number') design(center);
  return aroundTheLoop(input, (x, i) => {
    if (typeof center !== 'number' && i % 16 === 0) design(center[i]);
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  });
}

/**
 * A slow, smooth, random curve in 0..1 that loops: `points` random values
 * spaced evenly around the loop, joined with cosine curves.
 */
export function wander(length: number, points: number, random: Random): Float32Array {
  const count = Math.max(2, Math.round(points));
  const values = Array.from({ length: count }, () => random());
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = (i / length) * count;
    const k = Math.floor(pos);
    const t = pos - k;
    const a = values[k % count];
    const b = values[(k + 1) % count];
    out[i] = a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * t));
  }
  return out;
}

/** Adds a short sound starting at `start` (samples), wrapping past the end of the loop. */
export function addEvent(
  out: Float32Array,
  start: number,
  length: number,
  sample: (k: number) => number,
): void {
  const n = out.length;
  const s = ((Math.round(start) % n) + n) % n;
  for (let k = 0; k < length; k++) out[(s + k) % n] += sample(k);
}

/** A raised-cosine fade (0 → 1) over `n` samples: no clicks. */
export function fadeIn(k: number, n: number): number {
  if (k >= n) return 1;
  return 0.5 - 0.5 * Math.cos((Math.PI * k) / n);
}

export function mix(...parts: [Float32Array, number][]): Float32Array {
  const out = new Float32Array(parts[0][0].length);
  for (const [buf, gain] of parts) {
    for (let i = 0; i < out.length; i++) out[i] += buf[i] * gain;
  }
  return out;
}

export function multiply(input: Float32Array, curve: (i: number) => number): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] * curve(i);
  return out;
}

/** Frequency of a note name such as "A4" or "F#3" (A4 = 440 Hz). */
export function hz(note: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) throw new Error(`Not a note: ${note}`);
  const steps: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  let semitones = steps[match[1]] + (Number(match[3]) - 4) * 12;
  if (match[2] === '#') semitones++;
  if (match[2] === 'b') semitones--;
  return 440 * 2 ** (semitones / 12);
}

/** A seeded random source for one sound, so each sound is repeatable on its own. */
export function seeded(seed: number): Random {
  return createRandom(seed);
}
