import { audioFade } from '@/theme/motion';

import type { Program } from '../program';
import { fan, rain, setup, setupWithLog } from '../testing/fakeEngine';
import { MINUTE } from '../timer';
import type { PlayableSound } from '../types';
import { WAKE_MS, WAKE_START_GAIN, wakeCrossfadeGain, wakeRiseGain } from '../wake';

const chimes: PlayableSound = { id: 'light-chimes', name: 'Light chimes', source: 9 };
const birds: PlayableSound = { id: 'morning-birds', name: 'Morning birds', source: 10 };
const XFADE = audioFade.timerEndMs;

/** A sleep sound on a 1-minute timer with the wake-up on. */
function sleeping(what: PlayableSound | Program = rain) {
  const t = setup();
  t.engine.setVolume(0.5);
  t.engine.setWakeUp(chimes);
  t.engine.start(what, 1);
  const chimesOutputs = () => t.outputs.filter((o) => o.sound.id === 'light-chimes');
  const live = () => t.outputs.filter((o) => !o.released);
  return { ...t, chimesOutputs, live };
}

describe('wake-up curves', () => {
  it('crossfades in to a low level as the sleep sound fades out', () => {
    expect(wakeCrossfadeGain(XFADE + 1, XFADE)).toBe(0);
    expect(wakeCrossfadeGain(XFADE / 2, XFADE)).toBeCloseTo(WAKE_START_GAIN / 2);
    expect(wakeCrossfadeGain(0, XFADE)).toBeCloseTo(WAKE_START_GAIN);
  });

  it('rises slowly from low to the chosen volume, never above it', () => {
    expect(wakeRiseGain(0)).toBeCloseTo(WAKE_START_GAIN);
    // Eased: still soft at the halfway point.
    expect(wakeRiseGain(WAKE_MS / 2)).toBeLessThan(0.4);
    expect(wakeRiseGain(WAKE_MS)).toBe(1);
    expect(wakeRiseGain(WAKE_MS * 2)).toBe(1);
  });
});

describe('gentle wake-up', () => {
  it('does nothing extra when switched off: the sound just fades out', () => {
    const { engine, outputs, advance } = setup();
    engine.start(rain, 1);
    advance(MINUTE + 500);
    expect(engine.getSnapshot().status).toBe('finished');
    expect(outputs).toHaveLength(1);
  });

  it('starts the wake-up sound under the last 30 s of the sleep fade', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    advance(MINUTE - XFADE - 1000);
    expect(chimesOutputs()).toHaveLength(0);

    advance(1000 + XFADE / 2);
    const [wake] = chimesOutputs();
    expect(wake.playing).toBe(true);
    expect(wake.volume).toBeCloseTo(0.5 * WAKE_START_GAIN * 0.5, 2);
    expect(engine.getSnapshot().phase).toBe('sleep');
  });

  it('hands over to the wake-up when the sleep timer ends, for five minutes', () => {
    const events: [string, Record<string, unknown> | undefined][] = [];
    const t = setupWithLog(events);
    t.engine.setWakeUp(chimes);
    t.engine.start(rain, 1);
    t.advance(MINUTE + 500);

    const snap = t.engine.getSnapshot();
    expect(snap.status).toBe('playing');
    expect(snap.phase).toBe('wake');
    expect(snap.sound).toBe(chimes);
    expect(snap.timer).toMatchObject({ kind: 'countdown', totalMs: WAKE_MS });
    // The sleep sound has gone; only the wake-up sound is left.
    expect(t.outputs.filter((o) => !o.released).map((o) => o.sound.id)).toEqual(['light-chimes']);
    // Reused, not restarted, so there's no jump at the handover.
    expect(t.outputs.filter((o) => o.sound.id === 'light-chimes')).toHaveLength(1);
    expect(events.find(([e]) => e === 'wake-start')?.[1]).toMatchObject({ sound: 'light-chimes' });
  });

  it('rises over the wake-up, then fades out and finishes', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    advance(MINUTE + 500);
    const wake = chimesOutputs()[0];
    const early = wake.volume;
    advance(3 * MINUTE);
    expect(wake.volume).toBeGreaterThan(early * 2);
    expect(wake.volume).toBeLessThanOrEqual(0.5);

    advance(2 * MINUTE);
    expect(engine.getSnapshot()).toMatchObject({ status: 'finished', phase: 'wake' });
    expect(wake.released).toBe(true);
  });

  it('never goes above the chosen volume', () => {
    const { advance, chimesOutputs } = sleeping();
    let peak = 0;
    for (let i = 0; i < 6 * 60; i++) {
      advance(1000);
      for (const o of chimesOutputs()) peak = Math.max(peak, o.volume);
    }
    expect(peak).toBeLessThanOrEqual(0.5);
    expect(peak).toBeGreaterThan(0.4);
  });

  it('keeps going with the screen off (heartbeats only)', () => {
    const { engine, advanceInBackground, chimesOutputs } = sleeping();
    advanceInBackground(MINUTE + 2 * MINUTE);
    expect(engine.getSnapshot().phase).toBe('wake');
    expect(chimesOutputs()[0].playing).toBe(true);
    advanceInBackground(3 * MINUTE + 1000);
    expect(engine.getSnapshot().status).toBe('finished');
  });

  it('picks up part-way through after a long gap, or finishes if it all passed', () => {
    const a = sleeping();
    a.jump(MINUTE + 2 * MINUTE);
    a.engine.tick();
    expect(a.engine.getSnapshot().phase).toBe('wake');
    expect(a.chimesOutputs()[0].volume).toBeGreaterThan(0.5 * WAKE_START_GAIN);

    const b = sleeping();
    b.jump(MINUTE + WAKE_MS + 1000);
    b.engine.tick();
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'finished', phase: 'wake' });
    expect(b.chimesOutputs()).toHaveLength(0);
  });

  it('holds the wake-up while paused', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    advance(MINUTE + MINUTE);
    engine.pause();
    expect(chimesOutputs()[0].playing).toBe(false);
    advance(10 * MINUTE);
    engine.resume();
    expect(engine.getSnapshot()).toMatchObject({ status: 'playing', phase: 'wake' });
  });

  it('takes the wake-up sound away again when time is added during the crossfade', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    advance(MINUTE - 10_000);
    expect(chimesOutputs()[0].playing).toBe(true);
    engine.addMinutes(5);
    expect(chimesOutputs()[0].released).toBe(true);
    expect(engine.getSnapshot().phase).toBe('sleep');
  });

  it('can be switched off or changed before the sleep timer ends', () => {
    const { engine, advance, chimesOutputs, outputs } = sleeping();
    advance(MINUTE - 10_000);
    engine.setWakeUp(birds);
    expect(chimesOutputs()[0].released).toBe(true);
    expect(outputs.find((o) => o.sound.id === 'morning-birds')?.playing).toBe(true);

    engine.setWakeUp(null);
    advance(20_000);
    expect(engine.getSnapshot().status).toBe('finished');
  });

  it('carries on unchanged if the setting changes once it has begun', () => {
    const { engine, advance } = sleeping();
    advance(MINUTE + 500);
    engine.setWakeUp(null);
    engine.addMinutes(10);
    engine.playUntilStopped();
    expect(engine.getSnapshot()).toMatchObject({ phase: 'wake', wakeUp: chimes });
    expect(engine.getSnapshot().timer).toMatchObject({ totalMs: WAKE_MS });
  });

  it('needs a timer: "Until I stop" never wakes', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    engine.playUntilStopped();
    advance(30 * MINUTE);
    expect(engine.getSnapshot()).toMatchObject({ status: 'playing', phase: 'sleep' });
    expect(chimesOutputs()).toHaveLength(0);
  });

  it('shows the wake-up on the lock screen', () => {
    const { advance, chimesOutputs } = sleeping();
    advance(MINUTE + 500);
    expect(chimesOutputs()[0].nowPlayingSubtitle).toBe('Waking gently · 5 min');
  });

  it('works after a mix and a shuffle too', () => {
    const mix = sleeping({
      kind: 'mix',
      id: 'm',
      name: 'Bedtime',
      layers: [
        { sound: rain, volume: 1 },
        { sound: fan, volume: 0.5 },
      ],
    });
    mix.advance(MINUTE + 500);
    expect(mix.live().map((o) => o.sound.id)).toEqual(['light-chimes']);

    const shuffle = sleeping({ kind: 'shuffle', name: 'Shuffle', sounds: [rain, fan] });
    shuffle.advance(MINUTE + 500);
    expect(shuffle.live().map((o) => o.sound.id)).toEqual(['light-chimes']);
  });

  it('an outside pause of the wake-up sound pauses the wake-up', () => {
    const { engine, advance, chimesOutputs } = sleeping();
    advance(MINUTE + 500);
    const wake = chimesOutputs()[0];
    wake.playing = false;
    wake.events.onExternalChange(false);
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', pausedExternally: true });
  });

  it('playing again after the wake-up starts the sleep sound afresh', () => {
    const { engine, advance } = sleeping();
    advance(MINUTE + WAKE_MS + 1000);
    engine.addMinutes(10);
    expect(engine.getSnapshot()).toMatchObject({ status: 'playing', phase: 'sleep', sound: rain });
  });
});
