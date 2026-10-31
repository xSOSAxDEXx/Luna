import { createExternalChangeDetector } from '../expoOutput';

const status = (
  playing: boolean,
  extra: Partial<{ isBuffering: boolean; isLoaded: boolean }> = {},
) => ({
  playing,
  isBuffering: false,
  isLoaded: true,
  ...extra,
});

describe('createExternalChangeDetector', () => {
  function setup() {
    let now = 0;
    const detector = createExternalChangeDetector(() => now);
    return { detector, advance: (ms: number) => (now += ms) };
  }

  it('ignores status lag right after the app plays or pauses', () => {
    const { detector, advance } = setup();
    detector.command(true);
    advance(300);
    expect(detector.check(status(false))).toBeNull();
  });

  it('reports a pause the app did not ask for', () => {
    const { detector, advance } = setup();
    detector.command(true);
    advance(5000);
    expect(detector.check(status(true))).toBeNull();
    expect(detector.check(status(false))).toBe(false);
    // Reported once, not on every following update.
    expect(detector.check(status(false))).toBeNull();
  });

  it('reports a resume the app did not ask for (lock screen, end of a call)', () => {
    const { detector, advance } = setup();
    detector.command(false);
    advance(5000);
    expect(detector.check(status(true))).toBe(true);
  });

  it('ignores buffering and unloaded states', () => {
    const { detector, advance } = setup();
    detector.command(true);
    advance(5000);
    expect(detector.check(status(false, { isBuffering: true }))).toBeNull();
    expect(detector.check(status(false, { isLoaded: false }))).toBeNull();
  });
});
