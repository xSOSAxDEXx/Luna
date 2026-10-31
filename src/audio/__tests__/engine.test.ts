import { DEFAULT_VOLUME, STOP_FADE_MS, TICK_MS } from '../engine';
import { fan, rain, setup, setupWithLog } from '../testing/fakeEngine';
import { MINUTE, remainingMs } from '../timer';

describe('PlayerEngine', () => {
  it('starts playing straight away with a 10-minute timer', () => {
    const { engine, outputs, getNow } = setup();
    engine.start(rain);
    const s = engine.getSnapshot();
    expect(s.status).toBe('playing');
    expect(s.sound).toBe(rain);
    expect(remainingMs(s.timer!, getNow())).toBe(10 * MINUTE);
    expect(outputs[0].playing).toBe(true);
    expect(outputs[0].nowPlaying).toBe('Rain');
  });

  it('fades in from silence to the chosen volume', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.5);
    engine.start(rain);
    expect(outputs[0].volume).toBe(0);
    advance(750);
    expect(outputs[0].volume).toBeGreaterThan(0);
    expect(outputs[0].volume).toBeLessThan(0.5);
    advance(2000);
    expect(outputs[0].volume).toBe(0.5);
  });

  it('starts at a soft default volume', () => {
    const { engine } = setup();
    expect(engine.getSnapshot().volume).toBe(DEFAULT_VOLUME);
    expect(DEFAULT_VOLUME).toBeLessThanOrEqual(0.4);
  });

  it('fades out over the last 30 seconds, then stops at zero', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.5);
    engine.start(rain);

    advance(10 * MINUTE - 31_000);
    expect(outputs[0].volume).toBe(0.5);

    advance(16_000); // 15 s left
    expect(outputs[0].volume).toBeGreaterThan(0);
    expect(outputs[0].volume).toBeLessThan(0.25);
    expect(engine.getSnapshot().status).toBe('playing');

    advance(15_000 + TICK_MS);
    expect(engine.getSnapshot().status).toBe('finished');
    expect(outputs[0].volume).toBe(0);
    expect(outputs[0].released).toBe(true);
  });

  it('never jumps the volume up during the fade-out', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.6);
    engine.start(rain, 1);
    advance(30_000);
    let last = outputs[0].volume;
    for (let i = 0; i < 120; i++) {
      advance(TICK_MS);
      expect(outputs[0].volume).toBeLessThanOrEqual(last);
      last = outputs[0].volume;
    }
  });

  it('catches up after a long gap with no ticks', () => {
    const { engine, outputs, jump } = setup();
    engine.start(rain);
    jump(12 * MINUTE);
    engine.tick(); // what the app does when it returns to the foreground
    expect(engine.getSnapshot().status).toBe('finished');
    expect(outputs[0].released).toBe(true);
  });

  it('adds time with quick-add buttons, including during the fade', () => {
    const { engine, outputs, advance, getNow } = setup();
    engine.setVolume(0.5);
    engine.start(rain);
    advance(10 * MINUTE - 10_000); // deep in the fade
    expect(outputs[0].volume).toBeLessThan(0.1);

    engine.addMinutes(5);
    expect(remainingMs(engine.getSnapshot().timer!, getNow())).toBe(5 * MINUTE + 10_000);
    expect(outputs[0].volume).toBe(0.5);
  });

  it('plays until stopped', () => {
    const { engine, advance } = setup();
    engine.start(rain);
    engine.playUntilStopped();
    advance(3 * 60 * MINUTE);
    expect(engine.getSnapshot().status).toBe('playing');
    expect(engine.getSnapshot().timer).toEqual({ kind: 'untilStop' });
  });

  it('pauses and resumes without losing timer time', () => {
    const { engine, outputs, advance, getNow } = setup();
    engine.start(rain);
    advance(4 * MINUTE);
    engine.pause();
    expect(outputs[0].playing).toBe(false);
    advance(20 * MINUTE);
    expect(engine.getSnapshot().status).toBe('paused');

    engine.resume();
    expect(outputs[0].playing).toBe(true);
    expect(remainingMs(engine.getSnapshot().timer!, getNow())).toBe(6 * MINUTE);
  });

  it('fades back in on resume', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.5);
    engine.start(rain);
    advance(MINUTE);
    engine.pause();
    engine.resume();
    expect(outputs[0].volume).toBe(0);
    advance(2000);
    expect(outputs[0].volume).toBe(0.5);
  });

  it('stops with a short fade rather than a hard cut', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.5);
    engine.start(rain);
    advance(5000);
    engine.stop();
    expect(engine.getSnapshot().status).toBe('idle');
    expect(outputs[0].released).toBe(false);

    advance(STOP_FADE_MS / 2);
    expect(outputs[0].volume).toBeGreaterThan(0);
    expect(outputs[0].volume).toBeLessThan(0.5);

    advance(STOP_FADE_MS);
    expect(outputs[0].released).toBe(true);
  });

  it('switches sounds, fading the old one out', () => {
    const { engine, outputs, advance } = setup();
    engine.start(rain);
    advance(5000);
    engine.start(fan);
    expect(engine.getSnapshot().sound).toBe(fan);
    expect(outputs[1].playing).toBe(true);
    advance(STOP_FADE_MS + 10);
    expect(outputs[0].released).toBe(true);
    expect(outputs[1].released).toBe(false);
  });

  it('plays the same sound again when time is added after it finished', () => {
    const { engine, outputs, advance, getNow } = setup();
    engine.start(rain, 1);
    advance(MINUTE + TICK_MS);
    expect(engine.getSnapshot().status).toBe('finished');

    engine.addMinutes(15);
    expect(engine.getSnapshot().status).toBe('playing');
    expect(engine.getSnapshot().sound).toBe(rain);
    expect(outputs[1].playing).toBe(true);
    expect(remainingMs(engine.getSnapshot().timer!, getNow())).toBe(15 * MINUTE);
  });

  it('applies volume changes at once and clamps them', () => {
    const { engine, outputs, advance } = setup();
    engine.start(rain);
    advance(2000);
    engine.setVolume(0.8);
    expect(outputs[0].volume).toBe(0.8);
    engine.setVolume(3);
    expect(engine.getSnapshot().volume).toBe(1);
  });

  it('notifies subscribers of state changes', () => {
    const { engine } = setup();
    const statuses: string[] = [];
    engine.subscribe((s) => statuses.push(s.status));
    engine.start(rain);
    engine.pause();
    engine.resume();
    engine.stop();
    expect(statuses).toEqual(['playing', 'paused', 'playing', 'idle']);
  });

  describe('with the app in the background (JS timers frozen)', () => {
    it('still fades out and stops on time, driven by audio heartbeats', () => {
      const { engine, outputs, advanceInBackground } = setup();
      engine.setVolume(0.5);
      engine.start(rain);

      advanceInBackground(10 * MINUTE - 15_000);
      expect(outputs[0].volume).toBeGreaterThan(0);
      expect(outputs[0].volume).toBeLessThan(0.1);

      advanceInBackground(15_500);
      expect(engine.getSnapshot().status).toBe('finished');
      expect(outputs[0].released).toBe(true);
    });

    it('logs how late the stop was', () => {
      const events: [string, Record<string, unknown> | undefined][] = [];
      const { engine, advanceInBackground } = setupWithLog(events);
      engine.start(rain, 1);
      advanceInBackground(MINUTE + 500);
      const finish = events.find(([e]) => e === 'finish');
      expect(finish?.[1]?.lateMs).toBeLessThanOrEqual(500);
    });

    it('finishes a stop fade even if the app is backgrounded straight after Stop', () => {
      const { engine, outputs, advance, advanceInBackground } = setup();
      engine.start(rain);
      advance(5000);
      engine.stop();
      advanceInBackground(STOP_FADE_MS + 600);
      expect(outputs[0].released).toBe(true);
    });
  });

  describe('outside pauses and resumes', () => {
    it('mirrors a pause from a call or the lock screen and holds the timer', () => {
      const { engine, outputs, advance, getNow } = setup();
      engine.start(rain);
      advance(2 * MINUTE);
      outputs[0].playing = false; // the OS paused it
      outputs[0].events.onExternalChange(false);

      const s = engine.getSnapshot();
      expect(s.status).toBe('paused');
      expect(s.pausedExternally).toBe(true);
      advance(30 * MINUTE);
      expect(remainingMs(engine.getSnapshot().timer!, getNow())).toBe(8 * MINUTE);
    });

    it('carries on, without a second fade-in, when resumed from outside', () => {
      const { engine, outputs, advance, getNow } = setup();
      engine.setVolume(0.5);
      engine.start(rain);
      advance(2 * MINUTE);
      outputs[0].events.onExternalChange(false);
      advance(MINUTE);

      outputs[0].events.onExternalChange(true);
      const s = engine.getSnapshot();
      expect(s.status).toBe('playing');
      expect(s.pausedExternally).toBe(false);
      expect(outputs[0].volume).toBe(0.5);
      expect(remainingMs(s.timer!, getNow())).toBe(8 * MINUTE);
    });

    it('clears the outside-pause flag when the parent resumes in the app', () => {
      const { engine, outputs } = setup();
      engine.start(rain);
      outputs[0].events.onExternalChange(false);
      engine.resume();
      expect(engine.getSnapshot().pausedExternally).toBe(false);
      expect(outputs[0].playing).toBe(true);
    });

    it('ignores events from a sound that has been replaced', () => {
      const { engine, outputs } = setup();
      engine.start(rain);
      engine.start(fan);
      outputs[0].events.onExternalChange(false);
      expect(engine.getSnapshot().status).toBe('playing');
    });
  });

  it('shows the time left on the lock screen, updated as it changes', () => {
    const { engine, outputs, advance } = setup();
    engine.start(rain);
    expect(outputs[0].nowPlaying).toBe('Rain');
    expect(outputs[0].nowPlayingSubtitle).toBe('10 min');
    advance(MINUTE + 1000);
    expect(outputs[0].nowPlayingSubtitle).toBe('9 min');
    engine.playUntilStopped();
    expect(outputs[0].nowPlayingSubtitle).toBe('Until you stop');
  });
});
