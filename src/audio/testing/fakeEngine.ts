/**
 * Test helper: a PlayerEngine on a fake clock, with fake audio outputs that
 * record what the engine asked of them. Shared by the engine test files.
 */
import { PlayerEngine } from '../engine';
import type { AudioOutput, OutputEvents, PlayableSound } from '../types';

export type FakeOutput = AudioOutput & {
  sound: PlayableSound;
  playing: boolean;
  volume: number;
  released: boolean;
  nowPlaying: string | null;
  nowPlayingSubtitle: string | null;
  events: OutputEvents;
};

export const rain: PlayableSound = { id: 'rain', name: 'Rain', source: 1 };
export const fan: PlayableSound = { id: 'fan', name: 'Fan', source: 2 };

/** An engine on a fake clock, with fake outputs we can inspect. */
export function setupWithLog(events: [string, Record<string, unknown> | undefined][]) {
  return setup((e, d) => events.push([e, d]));
}

export function setup(
  log?: (event: string, detail?: Record<string, unknown>) => void,
  random: () => number = () => 0.42,
) {
  let now = 1_700_000_000_000;
  const outputs: FakeOutput[] = [];
  let intervals: { fn: () => void; ms: number; next: number; id: number }[] = [];
  let timeouts: { fn: () => void; at: number }[] = [];
  let nextId = 1;

  const engine = new PlayerEngine({
    log,
    random,
    now: () => now,
    createOutput: (sound, events) => {
      const out: FakeOutput = {
        sound,
        events,
        nowPlayingSubtitle: null,
        playing: false,
        volume: -1,
        released: false,
        nowPlaying: null,
        play: () => void (out.playing = true),
        pause: () => void (out.playing = false),
        setVolume: (v) => void (out.volume = v),
        showNowPlaying: (t, sub) => {
          out.nowPlaying = t;
          out.nowPlayingSubtitle = sub;
        },
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

  /**
   * Like a locked Android phone: JS timers are frozen, and only heartbeats
   * from audible outputs (every `beatMs`) reach the engine.
   */
  function advanceInBackground(ms: number, beatMs = 500) {
    const end = now + ms;
    while (now + beatMs <= end) {
      now += beatMs;
      outputs.filter((o) => o.playing && !o.released).forEach((o) => o.events.onHeartbeat());
    }
    now = end;
    intervals.forEach((i) => (i.next = now + i.ms));
    timeouts.forEach((t) => (t.at = Math.max(t.at, now)));
  }

  return { engine, outputs, advance, advanceInBackground, jump, getNow: () => now };
}
