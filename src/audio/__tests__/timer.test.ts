import {
  addMinutes,
  countdown,
  fadeInGain,
  fadeOutGain,
  formatRemaining,
  isExpired,
  MINUTE,
  pause,
  progress,
  remainingMs,
  resume,
  untilStop,
} from '../timer';

const T0 = 1_700_000_000_000;

describe('countdown', () => {
  it('counts down from wall-clock time', () => {
    const t = countdown(T0, 10);
    expect(remainingMs(t, T0)).toBe(10 * MINUTE);
    expect(remainingMs(t, T0 + 4 * MINUTE)).toBe(6 * MINUTE);
    expect(remainingMs(t, T0 + 11 * MINUTE)).toBe(0);
    expect(isExpired(t, T0 + 10 * MINUTE)).toBe(true);
  });

  it('stays correct across a long gap with no ticks (backgrounded app)', () => {
    const t = countdown(T0, 30);
    expect(remainingMs(t, T0 + 17 * MINUTE + 30_000)).toBe(12 * MINUTE + 30_000);
  });
});

describe('addMinutes', () => {
  it('adds to the time left and refills the ring', () => {
    const t = addMinutes(countdown(T0, 10), 5, T0 + 4 * MINUTE);
    expect(remainingMs(t, T0 + 4 * MINUTE)).toBe(11 * MINUTE);
    expect(progress(t, T0 + 4 * MINUTE)).toBeCloseTo(11 / 15);
  });

  it('stacks repeated taps', () => {
    let t = countdown(T0, 10);
    for (const m of [5, 10, 15, 30]) t = addMinutes(t, m, T0);
    expect(remainingMs(t, T0)).toBe(70 * MINUTE);
  });

  it('starts fresh from "until I stop"', () => {
    const t = addMinutes(untilStop, 15, T0);
    expect(remainingMs(t, T0)).toBe(15 * MINUTE);
    expect(progress(t, T0)).toBe(1);
  });

  it('starts fresh after the timer has run out', () => {
    const t = addMinutes(countdown(T0, 10), 5, T0 + 20 * MINUTE);
    expect(remainingMs(t, T0 + 20 * MINUTE)).toBe(5 * MINUTE);
  });

  it('adds to a paused timer without starting it', () => {
    const paused = pause(countdown(T0, 10), T0 + 2 * MINUTE);
    const t = addMinutes(paused, 5, T0 + 3 * MINUTE);
    expect(remainingMs(t, T0 + 9 * MINUTE)).toBe(13 * MINUTE);
  });
});

describe('pause and resume', () => {
  it('freezes the time left while paused', () => {
    const paused = pause(countdown(T0, 10), T0 + 3 * MINUTE);
    expect(remainingMs(paused, T0 + 50 * MINUTE)).toBe(7 * MINUTE);
    const resumed = resume(paused, T0 + 50 * MINUTE);
    expect(remainingMs(resumed, T0 + 52 * MINUTE)).toBe(5 * MINUTE);
  });

  it('ignores pausing twice', () => {
    const once = pause(countdown(T0, 10), T0 + MINUTE);
    expect(pause(once, T0 + 5 * MINUTE)).toBe(once);
  });
});

describe('"until I stop"', () => {
  it('never runs out', () => {
    expect(remainingMs(untilStop, T0)).toBe(Infinity);
    expect(isExpired(untilStop, T0 + 1e12)).toBe(false);
    expect(progress(untilStop, T0)).toBe(1);
  });
});

describe('fades', () => {
  it('fades out over the last 30 seconds and reaches silence at zero', () => {
    expect(fadeOutGain(60_000, 30_000)).toBe(1);
    expect(fadeOutGain(30_000, 30_000)).toBe(1);
    expect(fadeOutGain(15_000, 30_000)).toBeGreaterThan(0);
    expect(fadeOutGain(15_000, 30_000)).toBeLessThan(0.5);
    expect(fadeOutGain(0, 30_000)).toBe(0);
  });

  it('only ever gets quieter as time runs out', () => {
    let last = 1;
    for (let r = 30_000; r >= 0; r -= 250) {
      const g = fadeOutGain(r, 30_000);
      expect(g).toBeLessThanOrEqual(last);
      last = g;
    }
  });

  it('fades in softly at the start', () => {
    expect(fadeInGain(0, 1500)).toBe(0);
    expect(fadeInGain(750, 1500)).toBeCloseTo(0.25);
    expect(fadeInGain(1500, 1500)).toBe(1);
    expect(fadeInGain(10, 0)).toBe(1);
  });
});

describe('formatRemaining', () => {
  it.each([
    [10 * MINUTE, '10 min'],
    [9 * MINUTE + 1, '10 min'],
    [MINUTE, '1 min'],
    [59_000, 'Under a minute'],
    [60 * MINUTE, '1 hr'],
    [95 * MINUTE, '1 hr 35 min'],
  ])('%i ms reads "%s"', (ms, text) => {
    expect(formatRemaining(countdown(T0, ms / MINUTE), T0)).toBe(text);
  });

  it('has calm text for the end and for no timer', () => {
    expect(formatRemaining(countdown(T0, 1), T0 + 2 * MINUTE)).toBe('Sleep well');
    expect(formatRemaining(untilStop, T0)).toBe('Until you stop');
  });
});
