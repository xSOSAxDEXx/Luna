import { audioFade } from '@/theme/motion';

import {
  addMinutes as addTimerMinutes,
  countdown,
  DEFAULT_TIMER_MINUTES,
  fadeInGain,
  fadeOutGain,
  isExpired,
  pause as pauseTimer,
  remainingMs,
  resume as resumeTimer,
  type SleepTimer,
  untilStop,
} from './timer';
import type { AudioOutput, CreateOutput, PlayableSound } from './types';

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type PlayerSnapshot = {
  status: PlayerStatus;
  sound: PlayableSound | null;
  timer: SleepTimer | null;
  /** The listener's chosen volume, 0..1, before any fade. */
  volume: number;
};

export type EngineDeps = {
  createOutput: CreateOutput;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
};

/** How often volume fades and the timer are re-evaluated while playing. */
export const TICK_MS = 250;
/** A tap on Stop, or switching sounds, still fades rather than cutting off. */
export const STOP_FADE_MS = 1_000;
const STOP_FADE_STEPS = 8;

export const DEFAULT_VOLUME = 0.35;

/**
 * Plays one sound at a time on a sleep timer.
 *
 * All timing comes from `now()` (wall-clock), and every tick recomputes the
 * volume from scratch, so a late or skipped tick never leaves the fade or
 * timer out of step.
 */
export class PlayerEngine {
  private output: AudioOutput | null = null;
  private ticker: unknown = null;
  /** When the current fade-in began (start or resume). */
  private fadeInFrom = 0;
  private listeners = new Set<(s: PlayerSnapshot) => void>();
  private snapshot: PlayerSnapshot = {
    status: 'idle',
    sound: null,
    timer: null,
    volume: DEFAULT_VOLUME,
  };

  private readonly createOutput: CreateOutput;
  private readonly now: () => number;
  private readonly setIntervalFn: (fn: () => void, ms: number) => unknown;
  private readonly clearIntervalFn: (handle: unknown) => void;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => unknown;

  constructor(deps: EngineDeps) {
    this.createOutput = deps.createOutput;
    this.now = deps.now ?? (() => Date.now());
    this.setIntervalFn = deps.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this.clearIntervalFn =
      deps.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
    this.setTimeoutFn = deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  }

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  subscribe = (listener: (s: PlayerSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts a sound with a fresh timer (10 minutes unless told otherwise). */
  start(sound: PlayableSound, minutes: number | 'untilStop' = DEFAULT_TIMER_MINUTES) {
    this.fadeAndRelease();
    const output = this.createOutput(sound);
    this.output = output;
    output.setVolume(0);
    output.showNowPlaying(sound.name);
    output.play();

    const now = this.now();
    this.fadeInFrom = now;
    this.update({
      status: 'playing',
      sound,
      timer: minutes === 'untilStop' ? untilStop : countdown(now, minutes),
    });
    this.startTicker();
    this.tick();
  }

  pause() {
    if (this.snapshot.status !== 'playing' || !this.snapshot.timer) return;
    this.output?.pause();
    this.stopTicker();
    this.update({ status: 'paused', timer: pauseTimer(this.snapshot.timer, this.now()) });
  }

  resume() {
    if (this.snapshot.status !== 'paused' || !this.snapshot.timer) return;
    const now = this.now();
    this.fadeInFrom = now;
    this.output?.setVolume(0);
    this.output?.play();
    this.update({ status: 'playing', timer: resumeTimer(this.snapshot.timer, now) });
    this.startTicker();
    this.tick();
  }

  /** Stops on request, with a short fade. */
  stop() {
    this.stopTicker();
    this.fadeAndRelease();
    this.update({ status: 'idle', sound: null, timer: null });
  }

  /**
   * Quick-add. After the timer has finished, adding time plays the same
   * sound again for that long.
   */
  addMinutes(minutes: number) {
    const { status, sound, timer } = this.snapshot;
    if (status === 'finished' && sound) {
      this.start(sound, minutes);
      return;
    }
    if (!timer) return;
    this.update({ timer: addTimerMinutes(timer, minutes, this.now()) });
    this.tick();
  }

  /** "Until I stop": no timer at all. */
  playUntilStopped() {
    const { status, sound, timer } = this.snapshot;
    if (status === 'finished' && sound) {
      this.start(sound, 'untilStop');
      return;
    }
    if (!timer) return;
    this.update({ timer: untilStop });
    this.tick();
  }

  setVolume(volume: number) {
    this.update({ volume: Math.min(1, Math.max(0, volume)) });
    this.tick();
  }

  /**
   * Re-evaluates volume and the timer. Runs on an interval while playing, and
   * should also be called when the app returns to the foreground.
   */
  tick = () => {
    const { status, timer, volume } = this.snapshot;
    if (status !== 'playing' || !timer || !this.output) return;
    const now = this.now();

    if (isExpired(timer, now)) {
      this.finish();
      return;
    }
    const gain =
      fadeInGain(now - this.fadeInFrom, audioFade.startMs) *
      fadeOutGain(remainingMs(timer, now), audioFade.timerEndMs);
    this.output.setVolume(volume * gain);
  };

  /** The timer ran out. The fade has already brought the volume to zero. */
  private finish() {
    this.stopTicker();
    const output = this.output;
    this.output = null;
    if (output) {
      output.setVolume(0);
      output.release();
    }
    this.update({ status: 'finished' });
  }

  private fadeAndRelease() {
    const output = this.output;
    this.output = null;
    if (!output) return;
    const { volume, status } = this.snapshot;
    if (status !== 'playing') {
      output.release();
      return;
    }
    // Step the volume down on timeouts, then release.
    const stepMs = STOP_FADE_MS / STOP_FADE_STEPS;
    for (let i = 1; i <= STOP_FADE_STEPS; i++) {
      this.setTimeoutFn(() => {
        if (i === STOP_FADE_STEPS) {
          output.release();
        } else {
          const t = 1 - i / STOP_FADE_STEPS;
          output.setVolume(volume * t * t);
        }
      }, stepMs * i);
    }
  }

  private startTicker() {
    this.stopTicker();
    this.ticker = this.setIntervalFn(this.tick, TICK_MS);
  }

  private stopTicker() {
    if (this.ticker != null) this.clearIntervalFn(this.ticker);
    this.ticker = null;
  }

  private update(patch: Partial<PlayerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
