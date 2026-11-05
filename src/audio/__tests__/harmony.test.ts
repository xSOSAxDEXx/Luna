import {
  HARMONY_SECONDS,
  harmony174,
  harmony396,
  harmony528,
  harmony639,
  omDrone,
} from '../harmony';
import { normalize, rms } from '../noise';
import { createRandom } from '../synth';

/**
 * Harmony Tones, rendered at a low sample rate for speed. Checks: soft,
 * seamless at the loop point, repeatable, and a gentle swell rather than a
 * pulse.
 */
const FS = 8_000;
const N = FS * HARMONY_SECONDS;

const TONES = [
  ['174 Hz', harmony174],
  ['396 Hz', harmony396],
  ['528 Hz', harmony528],
  ['639 Hz', harmony639],
  ['Om drone', omDrone],
] as const;

describe.each(TONES)('%s', (_name, render) => {
  const raw = render(FS, N, createRandom(7));
  const loop = normalize(raw, 0.08, 0.9);

  it('is real sound', () => {
    expect(raw.every(Number.isFinite)).toBe(true);
    expect(rms(raw)).toBeGreaterThan(0);
  });

  it('loops without a click', () => {
    let typical = 0;
    for (let i = 1; i < N; i++) typical += Math.abs(loop[i] - loop[i - 1]);
    typical /= N - 1;
    expect(Math.abs(loop[0] - loop[N - 1])).toBeLessThan(typical * 4);
  });

  it('swells gently, never fading to silence or pulsing hard', () => {
    const win = FS / 2;
    const levels: number[] = [];
    for (let i = 0; i + win <= N; i += win) levels.push(rms(loop.subarray(i, i + win)));
    const rangeDb = 20 * Math.log10(Math.max(...levels) / Math.min(...levels));
    expect(rangeDb).toBeGreaterThan(1);
    expect(rangeDb).toBeLessThan(10);
  });

  it('is the same every time (fixed seed)', () => {
    expect(render(FS, N, createRandom(7))).toEqual(raw);
  });
});
