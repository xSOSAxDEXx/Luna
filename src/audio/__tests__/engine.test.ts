import { DEFAULT_VOLUME, PlayerEngine, STOP_FADE_MS, TICK_MS } from '../engine';
import { MINUTE, remainingMs } from '../timer';
import type { AudioOutput, PlayableSound } from '../types';

type FakeOutput = AudioOutput & {
  sound: PlayableSound;
  playing: boolean;
  volume: number;
  released: boolean;
  nowPlaying: string | null;
};

const rain: PlayableSound = { id: 'rain', name: 'Rain', source: 1 };
const fan: PlayableSound = { id: 'fan', name: 'Fan', source: 2 };

/** An engine on a fake clock, with fake outputs we can inspect. */
function setup() {
  let now = 1_700_000_000_000;
  const outputs: FakeOutput[] = [];
  let intervals: { fn: () => void; ms: number; next: number; id: number }[] = [];
  let timeouts: { fn: () => void; at: number }[] = [];
  let nextId = 1;

  const engine = new PlayerEngine({
    now: () => now,
    createOutput: (sound) => {
      const out: FakeOutput = {
        sound,
        playing: false,
        volume: -1,
        released: false,
        nowPlaying: null,
        play: () => void (out.playing = true),
        pause: () => void (out.playing = false),
        setVolume: (v) => void (out.volume = v),
        showNowPlaying: (t) => void (out.nowPlaying = t),
        release: () => {
          out.released = true;
          out.playing = false;
        },
      };
      outputs.push(out);
      return out;
    },
    setInterval: (fn, ms) => {
      const id = nextId++;
      intervals.push({ fn, ms, next: now + ms, id });
      return id;
    },
    clearInterval: (id) => {
      intervals = intervals.filter((i) => i.id !== id);
    },
    setTimeout: (fn, ms) => {
      timeouts.push({ fn, at: now + ms });
    },
  });

  /** Advances the clock, firing intervals and timeouts on the way. */
  function advance(ms: number) {
    const end = now + ms;
    for (;;) {
      const nextInterval = intervals.reduce((m, i) => Math.min(m, i.next), Infinity);
      const nextTimeout = timeouts.reduce((m, t) => Math.min(m, t.at), Infinity);
      const next = Math.min(nextInterval, nextTimeout);
      if (next > end) break;
      now = next;
      const due = timeouts.filter((t) => t.at <= now);
      timeouts = timeouts.filter((t) => t.at > now);
      due.forEach((t) => t.fn());
      intervals
        .filter((i) => i.next <= now)
        .forEach((i) => {
          i.next += i.ms;
          i.fn();
        });
    }
    now = end;
  }

  /** Jumps the clock with no ticks at all (a suspended app). */
  function jump(ms: number) {
    now += ms;
    intervals.forEach((i) => (i.next = now + i.ms));
  }

  return { engine, outputs, advance, jump, getNow: () => now };
}

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
});
