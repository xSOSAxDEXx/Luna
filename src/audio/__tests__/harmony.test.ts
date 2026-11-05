import {
  BOWL_SECONDS,
  HARMONY_SECONDS,
  harmony174,
  harmony396,
  harmony528,
  harmony639,
  omDrone,
  singingBowl,
} from '../harmony';
import { musicBox432, PIECES_432, slowPiano432 } from '../music';
import { normalize, rms } from '../noise';
import { createRandom, hz, tuned } from '../synth';

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

  it('swells very gently: no pulsing, never fading away', () => {
    const win = FS / 2;
    const levels: number[] = [];
    for (let i = 0; i + win <= N; i += win) levels.push(rms(loop.subarray(i, i + win)));
    const rangeDb = 20 * Math.log10(Math.max(...levels) / Math.min(...levels));
    expect(rangeDb).toBeGreaterThan(0.5);
    expect(rangeDb).toBeLessThan(4);
  });

  it('is the same every time (fixed seed)', () => {
    expect(render(FS, N, createRandom(7))).toEqual(raw);
  });
});

describe('singing bowl', () => {
  const n = FS * BOWL_SECONDS;
  const raw = singingBowl(FS, n, createRandom(7));
  const loop = normalize(raw, 0.08, 0.9);

  it('loops without a click, even with a ring wrapping past the end', () => {
    let typical = 0;
    for (let i = 1; i < n; i++) typical += Math.abs(loop[i] - loop[i - 1]);
    typical /= n - 1;
    expect(Math.abs(loop[0] - loop[n - 1])).toBeLessThan(typical * 4);
  });

  it('is struck softly: no strike jumps far above the ring', () => {
    const win = Math.round(FS * 0.4);
    const levels: number[] = [];
    for (let i = 0; i + win <= n; i += win) levels.push(rms(loop.subarray(i, i + win)));
    expect(20 * Math.log10(Math.max(...levels) / rms(loop))).toBeLessThan(8);
    // It rings on between strikes rather than falling silent.
    expect(20 * Math.log10(Math.min(...levels) / rms(loop))).toBeGreaterThan(-14);
  });

  it('swells into each strike (a padded mallet, not a click)', () => {
    // The first 10 ms after the loudest moment's onset stay well below its peak.
    let peakAt = 0;
    for (let i = 0; i < n; i++) if (Math.abs(loop[i]) > Math.abs(loop[peakAt])) peakAt = i;
    const before = loop.subarray(
      Math.max(0, peakAt - Math.round(FS * 0.06)),
      peakAt - Math.round(FS * 0.05),
    );
    const early = before.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(early).toBeLessThan(Math.abs(loop[peakAt]));
  });

  it('is the same every time (fixed seed)', () => {
    expect(singingBowl(FS, n, createRandom(7))).toEqual(raw);
  });
});

describe('432 Hz lullabies', () => {
  const PIECES = [
    ['music box', musicBox432, PIECES_432.musicBox.seconds],
    ['slow piano', slowPiano432, PIECES_432.piano.seconds],
  ] as const;

  it('are tuned to A = 432 Hz', () => {
    expect(tuned('A4', 432)).toBeCloseTo(432);
    expect(tuned('C5', 432)).toBeCloseTo(hz('C5') * (432 / 440));
  });

  it('are slow: 60–80 beats a minute', () => {
    // Music box: 48 beats; piano: 8 bars of 4.
    expect((48 / PIECES_432.musicBox.seconds) * 60).toBeGreaterThanOrEqual(60);
    expect((48 / PIECES_432.musicBox.seconds) * 60).toBeLessThanOrEqual(80);
    expect((32 / PIECES_432.piano.seconds) * 60).toBe(60);
  });

  describe.each(PIECES)('%s', (_name, render, seconds) => {
    const n = Math.round(FS * seconds);
    const loop = normalize(render(FS, n), 0.08, 0.9);

    it('loops without a click', () => {
      let typical = 0;
      for (let i = 1; i < n; i++) typical += Math.abs(loop[i] - loop[i - 1]);
      typical /= n - 1;
      expect(Math.abs(loop[0] - loop[n - 1])).toBeLessThan(typical * 4);
    });

    it('stays steady: no note jumps out', () => {
      const win = Math.round(FS * 0.4);
      const levels: number[] = [];
      for (let i = 0; i + win <= n; i += win) levels.push(rms(loop.subarray(i, i + win)));
      expect(20 * Math.log10(Math.max(...levels) / rms(loop))).toBeLessThan(5);
    });
  });
});
