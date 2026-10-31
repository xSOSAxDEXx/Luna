import { generateChimesLoop } from '../chimes';
import { rms } from '../noise';

describe('light chimes', () => {
  const rate = 8000;
  const loop = generateChimesLoop({ sampleRate: rate, seconds: 12 });

  it('is soft, with no loud peaks', () => {
    expect(rms(loop)).toBeCloseTo(0.07, 2);
    expect(Math.max(...loop.map(Math.abs))).toBeLessThan(0.5);
  });

  it('loops without a click: the end flows into the start', () => {
    let typical = 0;
    for (let i = 1; i < loop.length; i++) typical += Math.abs(loop[i] - loop[i - 1]);
    typical /= loop.length - 1;
    expect(Math.abs(loop[0] - loop[loop.length - 1])).toBeLessThan(typical * 4);
  });

  it('is the same every time (fixed seed)', () => {
    expect(generateChimesLoop({ sampleRate: rate, seconds: 12 })).toEqual(loop);
  });
});
