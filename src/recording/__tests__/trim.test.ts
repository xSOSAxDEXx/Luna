import { findTrim, LEAD_PAD_MS, loopRangeSeek, TAIL_PAD_MS } from '../trim';

/** Levels every 100 ms: quiet room noise, with a voice from `from` to `to` (ms). */
function take(durationMs: number, from: number, to: number, voiceDb = -12, roomDb = -58) {
  const levels = [];
  for (let at = 0; at <= durationMs; at += 100) {
    levels.push({ atMs: at, db: at >= from && at <= to ? voiceDb : roomDb });
  }
  return levels;
}

describe('findTrim', () => {
  it('finds the voice between quiet stretches, with a little room either side', () => {
    expect(findTrim(take(20_000, 3_000, 15_000), 20_000)).toEqual({
      startMs: 3_000 - LEAD_PAD_MS,
      endMs: 15_000 + TAIL_PAD_MS,
    });
  });

  it('leaves a recording alone when there is little or no silence', () => {
    expect(findTrim(take(10_000, 100, 9_900), 10_000)).toBeNull();
    expect(findTrim(take(10_000, 0, 10_000), 10_000)).toBeNull();
  });

  it('leaves it alone when it is all quiet (nothing to go on)', () => {
    expect(findTrim(take(10_000, 0, 0, -58), 10_000)).toBeNull();
  });

  it('copes with no levels (a browser without metering)', () => {
    expect(findTrim([], 10_000)).toBeNull();
  });

  it('works out "quiet" from the take itself, so a soft voice still counts', () => {
    // A whispered story at −38 dB in a room at −62 dB.
    const range = findTrim(take(20_000, 4_000, 16_000, -38, -62), 20_000);
    expect(range).toEqual({ startMs: 3_750, endMs: 16_600 });
  });

  it('never runs past the ends of the file', () => {
    const range = findTrim(take(10_000, 0, 6_000), 10_000);
    expect(range?.startMs).toBe(0);
    expect(range!.endMs).toBeLessThanOrEqual(10_000);
  });

  it('ignores readings that are not numbers', () => {
    const levels = [...take(20_000, 3_000, 15_000), { atMs: 1_000, db: NaN }];
    expect(findTrim(levels, 20_000)).toEqual({ startMs: 2_750, endMs: 15_600 });
  });
});

describe('loopRangeSeek', () => {
  const range = { startMs: 2_000, endMs: 10_000 };

  it('carries on inside the voice', () => {
    expect(loopRangeSeek(5_000, range)).toBeNull();
  });

  it('jumps back to the start of the voice at its end', () => {
    expect(loopRangeSeek(10_000, range)).toBe(2_000);
    expect(loopRangeSeek(10_400, range)).toBe(2_000);
  });

  it('skips the quiet start when the file loops back to 0 by itself', () => {
    expect(loopRangeSeek(100, range)).toBe(2_000);
  });
});
