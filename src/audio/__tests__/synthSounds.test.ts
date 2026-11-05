import { harp, lullaby, morningBirds, musicBox, PIECES, piano, playful } from '../music';
import { normalize, rms } from '../noise';
import * as scapes from '../soundscapes';
import { createRandom, hz } from '../synth';

/**
 * The synthesised sounds, rendered small and fast (8 kHz, a few seconds)
 * for the checks that matter: soft, no sudden peaks, a seamless loop point,
 * and the same output every time.
 */
const FS = 8_000;

type Gen = (fs: number, n: number, random: () => number) => Float32Array;
const SOUNDS: [string, Gen, number][] = [
  ['rain', scapes.rain, 6],
  ['ocean', scapes.ocean, 12],
  ['stream', scapes.stream, 6],
  ['wind', scapes.wind, 8],
  ['forest night', scapes.forestNight, 8],
  ['crickets', scapes.crickets, 6],
  ['heartbeat', scapes.heartbeat, 15],
  ['womb', scapes.womb, 15],
  ['shushing', scapes.shushing, 8],
  ['fan', scapes.fan, 6],
  ['car ride', scapes.carRide, 8],
  ['train', scapes.train, 8],
  ['lullaby', (fs, n) => lullaby(fs, n), PIECES.lullaby.seconds],
  ['music box', (fs, n) => musicBox(fs, n), PIECES.musicBox.seconds],
  ['piano', (fs, n) => piano(fs, n), PIECES.piano.seconds],
  ['harp', (fs, n) => harp(fs, n), PIECES.harp.seconds],
  ['morning birds', morningBirds, 8],
  ['playful melody', (fs, n) => playful(fs, n), PIECES.playful.seconds],
];

describe.each(SOUNDS)('%s', (_name, render, seconds) => {
  const n = Math.round(FS * seconds);
  const raw = render(FS, n, createRandom(42));
  const loop = normalize(raw, 0.08, 0.9);

  it('is real sound, not silence or garbage', () => {
    expect(loop).toHaveLength(n);
    expect(raw.every(Number.isFinite)).toBe(true);
    expect(rms(raw)).toBeGreaterThan(0);
  });

  it('has no sudden peaks once set to a soft level', () => {
    const peak = loop.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeLessThanOrEqual(0.9);
  });

  it('loops without a click: the end flows into the start', () => {
    let typical = 0;
    for (let i = 1; i < n; i++) typical += Math.abs(loop[i] - loop[i - 1]);
    typical /= n - 1;
    expect(Math.abs(loop[0] - loop[n - 1])).toBeLessThan(typical * 4 + 1e-6);
  });

  // The tunes use no randomness; everything else has a fixed seed.
  const random = !['lullaby', 'music box', 'piano', 'harp', 'playful melody'].includes(_name);
  if (random) {
    it('is the same every time (fixed seed)', () => {
      expect(render(FS, n, createRandom(42))).toEqual(raw);
    });
  }
});

describe('note names', () => {
  it('are tuned to A4 = 440 Hz', () => {
    expect(hz('A4')).toBeCloseTo(440);
    expect(hz('C4')).toBeCloseTo(261.63, 1);
    expect(hz('Bb2')).toBeCloseTo(116.54, 1);
    expect(() => hz('H2')).toThrow();
  });
});

describe('loop lengths', () => {
  it('fit each piece exactly, so tunes loop on the beat', () => {
    expect(PIECES.lullaby.seconds).toBe(24);
    expect(PIECES.piano.seconds).toBeCloseTo(30);
    expect(PIECES.playful.seconds).toBeCloseTo(19.2);
  });
});
