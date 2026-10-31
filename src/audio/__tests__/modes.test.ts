import { audioFade } from '@/theme/motion';

import { STOP_FADE_MS } from '../engine';
import { crossfadeGains, type Program, SHUFFLE_TRACK_MS, shuffleOrder } from '../program';
import { fan, rain, setup, setupWithLog } from '../testing/fakeEngine';
import { MINUTE } from '../timer';
import type { PlayableSound } from '../types';

const heartbeat: PlayableSound = { id: 'heartbeat', name: 'Heartbeat', source: 3 };
const musicBox: PlayableSound = { id: 'music-box', name: 'Music box', source: 4 };

const mix: Program = {
  kind: 'mix',
  id: 'mix-1',
  name: 'Bedtime',
  layers: [
    { sound: rain, volume: 1 },
    { sound: heartbeat, volume: 0.5 },
    { sound: musicBox, volume: 0.25 },
  ],
};

const shuffle = (sounds: PlayableSound[]): Program => ({
  kind: 'shuffle',
  name: 'Shuffle: Nature',
  sounds,
});

describe('Mix', () => {
  it('plays every layer at once, each at its own volume', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.4);
    engine.start(mix);
    advance(2000);

    expect(outputs.map((o) => o.sound.id)).toEqual(['rain', 'heartbeat', 'music-box']);
    expect(outputs.every((o) => o.playing)).toBe(true);
    expect(outputs.map((o) => o.volume)).toEqual([0.4, 0.2, 0.1]);
    expect(engine.getSnapshot().title).toBe('Bedtime');
  });

  it('shows the mix on the lock screen from its first layer only', () => {
    const { engine, outputs } = setup();
    engine.start(mix);
    expect(outputs[0].nowPlaying).toBe('Bedtime');
    expect(outputs[1].nowPlaying).toBeNull();
    expect(outputs[2].nowPlaying).toBeNull();
  });

  it('never plays more than three layers', () => {
    const { engine, outputs } = setup();
    engine.start({ ...mix, layers: [...mix.layers, { sound: fan, volume: 1 }] } as Program);
    expect(outputs).toHaveLength(3);
  });

  it('changes one layer’s volume while playing', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.4);
    engine.start(mix);
    advance(2000);
    engine.setLayerVolume(1, 1);
    expect(outputs[1].volume).toBe(0.4);
    expect(outputs[0].volume).toBe(0.4);
  });

  it('fades every layer out together at the end of the timer', () => {
    const { engine, outputs, advance } = setup();
    engine.start(mix, 1);
    advance(MINUTE - 10_000);
    const mid = outputs.map((o) => o.volume);
    expect(mid.every((v) => v > 0 && v < 0.35 * 0.1)).toBe(true);
    advance(10_500);
    expect(engine.getSnapshot().status).toBe('finished');
    expect(outputs.every((o) => o.released)).toBe(true);
  });

  it('pauses and resumes all layers', () => {
    const { engine, outputs } = setup();
    engine.start(mix);
    engine.pause();
    expect(outputs.some((o) => o.playing)).toBe(false);
    engine.resume();
    expect(outputs.every((o) => o.playing)).toBe(true);
  });

  it('pauses the other layers when the lock screen pauses the first', () => {
    const { engine, outputs } = setup();
    engine.start(mix);
    outputs[0].playing = false;
    outputs[0].events.onExternalChange(false);
    expect(engine.getSnapshot().status).toBe('paused');
    expect(outputs[1].playing).toBe(false);
    expect(outputs[2].playing).toBe(false);

    outputs[0].playing = true;
    outputs[0].events.onExternalChange(true);
    expect(outputs.every((o) => o.playing)).toBe(true);
  });

  it('ignores outside events from the other layers', () => {
    const { engine, outputs } = setup();
    engine.start(mix);
    outputs[2].events.onExternalChange(false);
    expect(engine.getSnapshot().status).toBe('playing');
  });

  it('keeps running in the background on any layer’s heartbeats', () => {
    const { engine, outputs, advanceInBackground } = setup();
    engine.start(mix, 1);
    advanceInBackground(MINUTE + 600);
    expect(engine.getSnapshot().status).toBe('finished');
    expect(outputs.every((o) => o.released)).toBe(true);
  });

  it('fades all layers out on Stop', () => {
    const { engine, outputs, advance } = setup();
    engine.start(mix);
    advance(5000);
    engine.stop();
    advance(STOP_FADE_MS + 10);
    expect(outputs.every((o) => o.released)).toBe(true);
  });

  it('plays a one-layer mix as a single sound, and ignores an empty one', () => {
    const { engine, outputs } = setup();
    engine.start({ kind: 'mix', name: 'Just rain', layers: [{ sound: rain, volume: 1 }] });
    expect(engine.getSnapshot().program?.kind).toBe('single');
    engine.stop();
    engine.start({ kind: 'mix', name: 'Nothing', layers: [] });
    expect(outputs).toHaveLength(1);
  });
});

describe('Shuffle', () => {
  const set = [rain, fan, heartbeat, musicBox];
  const xfade = audioFade.crossfadeMs;

  it('plays one sound at a time', () => {
    const { engine, outputs, advance } = setup();
    engine.start(shuffle(set), 'untilStop');
    advance(MINUTE);
    expect(outputs.filter((o) => o.playing && !o.released)).toHaveLength(1);
  });

  it('crossfades softly into the next sound every 5 minutes', () => {
    const { engine, outputs, advance } = setup();
    engine.setVolume(0.5);
    engine.start(shuffle(set), 'untilStop');
    const first = outputs[0];

    advance(SHUFFLE_TRACK_MS - xfade / 2);
    const next = outputs[1];
    expect(next.playing).toBe(true);
    // Halfway through an equal-power crossfade, both sit at about 71%.
    expect(first.volume).toBeCloseTo(0.5 * Math.SQRT1_2, 1);
    expect(next.volume).toBeCloseTo(0.5 * Math.SQRT1_2, 1);

    advance(xfade);
    expect(first.released).toBe(true);
    expect(next.volume).toBe(0.5);
    expect(engine.getSnapshot().sound?.id).toBe(next.sound.id);
    expect(next.sound.id).not.toBe(first.sound.id);
  });

  it('goes through every sound before repeating, and never repeats back to back', () => {
    const { engine, outputs, advance } = setup(undefined, Math.random);
    engine.start(shuffle(set), 'untilStop');
    advance(SHUFFLE_TRACK_MS * 12 + 1000);
    const played = outputs.map((o) => o.sound.id);
    expect(new Set(played.slice(0, 4)).size).toBe(4);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });

  it('shows the set and the current sound on the lock screen', () => {
    const { engine, outputs, advance } = setup();
    engine.start(shuffle(set), 'untilStop');
    expect(outputs[0].nowPlaying).toBe('Shuffle: Nature');
    expect(outputs[0].nowPlayingSubtitle).toBe(`${outputs[0].sound.name} · Until you stop`);
    advance(SHUFFLE_TRACK_MS + 500);
    expect(outputs[1].nowPlaying).toBe('Shuffle: Nature');
    expect(outputs[1].nowPlayingSubtitle).toContain(outputs[1].sound.name);
  });

  it('holds its place while paused', () => {
    const { engine, outputs, advance } = setup();
    engine.start(shuffle(set), 'untilStop');
    advance(3 * MINUTE);
    engine.pause();
    advance(20 * MINUTE);
    engine.resume();
    advance(MINUTE);
    // 4 minutes of play: still the first sound, no crossfade yet.
    expect(outputs).toHaveLength(1);
  });

  it('crossfades in the background, driven by heartbeats', () => {
    const { engine, outputs, advanceInBackground } = setup();
    engine.start(shuffle(set), 'untilStop');
    advanceInBackground(SHUFFLE_TRACK_MS + 1000);
    expect(outputs[0].released).toBe(true);
    expect(outputs[1].playing).toBe(true);
  });

  it('catches up after a long gap without starting a player per skipped sound', () => {
    const { engine, outputs, jump } = setup();
    engine.start(shuffle(set), 'untilStop');
    jump(SHUFFLE_TRACK_MS * 6 + 30_000);
    engine.tick();
    const live = outputs.filter((o) => !o.released);
    expect(live).toHaveLength(1);
    expect(outputs.length).toBeLessThanOrEqual(2);
  });

  it('logs each change of sound', () => {
    const events: [string, Record<string, unknown> | undefined][] = [];
    const { engine, advance } = setupWithLog(events);
    engine.start(shuffle(set), 'untilStop');
    advance(SHUFFLE_TRACK_MS + 500);
    expect(events.filter(([e]) => e === 'shuffle-next')).toHaveLength(1);
  });

  it('logs the whole set at the start, not just the first sound', () => {
    const events: [string, Record<string, unknown> | undefined][] = [];
    const { engine } = setupWithLog(events);
    engine.start(shuffle(set), 'untilStop');
    const start = events.find(([e]) => e === 'start')?.[1];
    expect(start?.sounds).toEqual(set.map((s) => s.id));
    expect(start?.playing).toHaveLength(1);
  });

  it('treats a set of one as that sound looping', () => {
    const { engine } = setup();
    engine.start(shuffle([rain]));
    expect(engine.getSnapshot().program).toEqual({ kind: 'single', sound: rain });
  });
});

describe('shuffleOrder', () => {
  it('keeps every sound exactly once', () => {
    const order = shuffleOrder([rain, fan, heartbeat, musicBox]);
    expect(order.map((s) => s.id).sort()).toEqual(['fan', 'heartbeat', 'music-box', 'rain']);
  });

  it('never starts with the sound to avoid', () => {
    for (let i = 0; i < 50; i++) {
      expect(shuffleOrder([rain, fan, heartbeat], Math.random, 'rain')[0].id).not.toBe('rain');
    }
  });
});

describe('crossfadeGains', () => {
  it('keeps total power steady through the crossfade', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const [a, b] = crossfadeGains(t);
      expect(a * a + b * b).toBeCloseTo(1);
    }
  });
});
