import {
  createRandom,
  encodeWav,
  generateNoiseLoop,
  makeSeamless,
  type NoiseColor,
  rawNoise,
  rms,
} from '../noise';

const SR = 8_000; // small sample rate keeps the tests fast
const colors: NoiseColor[] = ['white', 'pink', 'brown'];

/** Average size of one sample-to-sample step, relative to loudness. */
function roughness(x: Float32Array) {
  let sum = 0;
  for (let i = 1; i < x.length; i++) sum += Math.abs(x[i] - x[i - 1]);
  return sum / (x.length - 1) / rms(x);
}

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('makeSeamless', () => {
  it('continues the original signal across the loop point', () => {
    // A ramp makes the join easy to check: after folding, the last sample of
    // the loop must lead straight into the first sample.
    const source = Float32Array.from({ length: 120 }, (_, i) => i);
    const loop = makeSeamless(source, 100);
    expect(loop).toHaveLength(100);
    expect(loop[99]).toBe(99);
    // The first sample is almost entirely the tail (sample 100), so the jump
    // from 99 back to it is about one step, not a jump down to 0.
    expect(Math.abs(loop[0] - 100)).toBeLessThan(1);
  });

  it('rejects a source with no room for a crossfade', () => {
    expect(() => makeSeamless(new Float32Array(10), 10)).toThrow();
  });
});

describe.each(colors)('%s noise loop', (color) => {
  const loop = generateNoiseLoop({ color, sampleRate: SR, seconds: 3, crossfadeSeconds: 0.5 });

  it('has the requested length', () => {
    expect(loop).toHaveLength(SR * 3);
  });

  it('is soft by default and never clips', () => {
    const peak = loop.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeLessThanOrEqual(0.95 + 1e-6);
    expect(rms(loop)).toBeLessThanOrEqual(0.1 + 1e-6);
    expect(rms(loop)).toBeGreaterThan(0.05);
  });

  it('has no click at the loop point', () => {
    const steps: number[] = [];
    for (let i = 1; i < loop.length; i++) steps.push(Math.abs(loop[i] - loop[i - 1]));
    steps.sort((a, b) => a - b);
    const p999 = steps[Math.floor(steps.length * 0.999)];
    const wrapStep = Math.abs(loop[0] - loop[loop.length - 1]);
    expect(wrapStep).toBeLessThanOrEqual(p999);
  });

  it('is identical every time it is generated', () => {
    const again = generateNoiseLoop({ color, sampleRate: SR, seconds: 3, crossfadeSeconds: 0.5 });
    expect(again).toEqual(loop);
  });
});

it('gets smoother from white to pink to brown', () => {
  const [white, pink, brown] = colors.map((c) => roughness(rawNoise(c, SR * 2, createRandom(7))));
  expect(white).toBeGreaterThan(pink);
  expect(pink).toBeGreaterThan(brown);
});

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header', () => {
    const bytes = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 32_000);
    const view = new DataView(bytes.buffer);
    const text = (o: number) => String.fromCharCode(...bytes.slice(o, o + 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(32_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8); // 4 samples * 2 bytes
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 0x7fff - 0.5));
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });
});
