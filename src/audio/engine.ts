import { audioFade } from '@/theme/motion';

import {
  addMinutes as addTimerMinutes,
  countdown,
  DEFAULT_TIMER_MINUTES,
  fadeInGain,
  fadeOutGain,
  formatRemaining,
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
  /**
   * Paused by something outside the app (a call, another app's audio, the
   * lock screen). The player gently offers to resume.
   */
  pausedExternally: boolean;
};

export type EngineLog = (event: string, detail?: Record<string, unknown>) => void;

export type EngineDeps = {
  createOutput: CreateOutput;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  /** Diagnostics; see src/diagnostics/log.ts. */
  log?: EngineLog;
};

/** How often the foreground ticker re-evaluates volume and the timer. */
export const TICK_MS = 250;
/** A tap on Stop, or switching sounds, still fades rather than cutting off. */
export const STOP_FADE_MS = 1_000;
const STOP_FADE_STEPS = 8;
/** A gap between ticks longer than this is logged (diagnostics only). */
const TICK_GAP_LOG_MS = 5_000;

export const DEFAULT_VOLUME = 0.35;

type FadingOutput = { output: AudioOutput; from: number; volume: number };

/**
 * Plays one sound at a time on a sleep timer.
 *
 * All timing comes from `now()` (wall-clock), and every tick recomputes the
 * volume from scratch, so a late or skipped tick never leaves the fade or
 * timer out of step.
 *
 * Ticks come from two places: a JS interval (smooth while the app is open)
 * and heartbeats from the audio output (which keep coming when the app is in
 * the background and JS timers are paused). Ticking is idempotent, so having
 * both is harmless.
 */
export class PlayerEngine {
  private output: AudioOutput | null = null;
  private ticker: unknown = null;
  /** When the current fade-in began (start or resume). */
  private fadeInFrom = 0;
  private lastTickAt = 0;
  /** The lock-screen subtitle last sent, so it's only updated when it changes. */
  private nowPlayingText = '';
  private fading: FadingOutput[] = [];
  private listeners = new Set<(s: PlayerSnapshot) => void>();
  private snapshot: PlayerSnapshot = {
    status: 'idle',
    sound: null,
    timer: null,
    volume: DEFAULT_VOLUME,
    pausedExternally: false,
  };

  private readonly createOutput: CreateOutput;
  private readonly now: () => number;
  private readonly setIntervalFn: (fn: () => void, ms: number) => unknown;
  private readonly clearIntervalFn: (handle: unknown) => void;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => unknown;
  private readonly log: EngineLog;

  constructor(deps: EngineDeps) {
    this.createOutput = deps.createOutput;
    this.now = deps.now ?? (() => Date.now());
    this.setIntervalFn = deps.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this.clearIntervalFn =
      deps.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
    this.setTimeoutFn = deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.log = deps.log ?? (() => {});
  }

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  subscribe = (listener: (s: PlayerSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts a sound with a fresh timer (10 minutes unless told otherwise). */
  start(sound: PlayableSound, minutes: number | 'untilStop' = DEFAULT_TIMER_MINUTES) {
    this.fadeAndRelease();
    const now = this.now();
    const timer = minutes === 'untilStop' ? untilStop : countdown(now, minutes);

    const output = this.createOutput(sound, {
      onHeartbeat: () => {
        // A sound that's fading out after Stop still sends heartbeats; they
        // move its fade on.
        if (this.output === output) this.tick('heartbeat');
        else this.advanceFades(this.now());
      },
      onExternalChange: (playing) => {
        if (this.output === output) this.handleExternalChange(playing);
      },
    });
    this.output = output;
    output.setVolume(0);
    this.nowPlayingText = formatRemaining(timer, now);
    output.showNowPlaying(sound.name, this.nowPlayingText);
    output.play();

    this.fadeInFrom = now;
    this.lastTickAt = now;
    this.update({ status: 'playing', sound, timer, pausedExternally: false });
    this.log('start', { sound: sound.id, minutes });
    this.startTicker();
    this.tick();
  }

  pause() {
    if (this.snapshot.status !== 'playing' || !this.snapshot.timer) return;
    this.output?.pause();
    this.stopTicker();
    this.update({ status: 'paused', timer: pauseTimer(this.snapshot.timer, this.now()) });
    this.log('pause');
  }

  resume() {
    if (this.snapshot.status !== 'paused' || !this.snapshot.timer) return;
    const now = this.now();
    this.fadeInFrom = now;
    this.lastTickAt = now;
    this.output?.setVolume(0);
    this.output?.play();
    this.update({
      status: 'playing',
      timer: resumeTimer(this.snapshot.timer, now),
      pausedExternally: false,
    });
    this.log('resume');
    this.startTicker();
    this.tick();
  }

  /** Stops on request, with a short fade. */
  stop() {
    this.stopTicker();
    this.fadeAndRelease();
    this.update({ status: 'idle', sound: null, timer: null, pausedExternally: false });
    this.log('stop');
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
    this.log('add-minutes', { minutes });
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
    this.log('until-stop');
    this.tick();
  }

  setVolume(volume: number) {
    this.update({ volume: Math.min(1, Math.max(0, volume)) });
    this.tick();
  }

  /**
   * Re-evaluates volume, the timer, the lock-screen text and any stop fades.
   * Called by the ticker, by output heartbeats, and when the app returns to
   * the foreground.
   */
  tick = (source: 'interval' | 'heartbeat' | 'foreground' | 'action' = 'action') => {
    const now = this.now();
    this.advanceFades(now);

    const { status, timer, volume, sound } = this.snapshot;
    if (status !== 'playing' || !timer || !this.output) return;

    const gap = now - this.lastTickAt;
    if (gap > TICK_GAP_LOG_MS) this.log('tick-gap', { ms: gap, source });
    this.lastTickAt = now;

    if (isExpired(timer, now)) {
      this.finish(now);
      return;
    }
    const gain =
      fadeInGain(now - this.fadeInFrom, audioFade.startMs) *
      fadeOutGain(remainingMs(timer, now), audioFade.timerEndMs);
    this.output.setVolume(volume * gain);

    const text = formatRemaining(timer, now);
    if (text !== this.nowPlayingText && sound) {
      this.nowPlayingText = text;
      this.output.showNowPlaying(sound.name, text);
    }
  };

  private handleExternalChange(playing: boolean) {
    const { status, timer } = this.snapshot;
    if (!timer) return;
    const now = this.now();
    if (!playing && status === 'playing') {
      // The OS already paused the audio; mirror it and hold the timer so a
      // phone call doesn't eat into sleep time.
      this.stopTicker();
      this.update({ status: 'paused', timer: pauseTimer(timer, now), pausedExternally: true });
      this.log('external-pause');
    } else if (playing && status === 'paused') {
      // Resumed from the lock screen, or by the OS after an interruption.
      // It's already audible, so skip the fade-in.
      this.fadeInFrom = now - audioFade.startMs;
      this.lastTickAt = now;
      this.update({ status: 'playing', timer: resumeTimer(timer, now), pausedExternally: false });
      this.log('external-resume');
      this.startTicker();
      this.tick();
    }
  }

  /** The timer ran out. The fade has already brought the volume to zero. */
  private finish(now: number) {
    this.stopTicker();
    const output = this.output;
    this.output = null;
    if (output) {
      output.setVolume(0);
      output.release();
    }
    const timer = this.snapshot.timer;
    this.update({ status: 'finished' });
    // How late the stop was compared with the timer's end, for diagnostics.
    this.log('finish', timer?.kind === 'countdown' ? { lateMs: now - timer.endsAt } : {});
  }

  /**
   * Fades an output out over STOP_FADE_MS, then releases it. Steps run on
   * timeouts and on heartbeats, so the fade completes even if the app is
   * backgrounded straight after tapping Stop.
   */
  private fadeAndRelease() {
    const output = this.output;
    this.output = null;
    if (!output) return;
    if (this.snapshot.status !== 'playing') {
      output.release();
      return;
    }
    const now = this.now();
    // Start the fade from what's audible now (it may already be mid-fade).
    const timer = this.snapshot.timer;
    const audible =
      this.snapshot.volume *
      fadeInGain(now - this.fadeInFrom, audioFade.startMs) *
      (timer ? fadeOutGain(remainingMs(timer, now), audioFade.timerEndMs) : 1);
    this.fading.push({ output, from: now, volume: audible });
    const stepMs = STOP_FADE_MS / STOP_FADE_STEPS;
    for (let i = 1; i <= STOP_FADE_STEPS; i++) {
      this.setTimeoutFn(() => this.advanceFades(this.now()), stepMs * i + 1);
    }
  }

  private advanceFades(now: number) {
    if (this.fading.length === 0) return;
    this.fading = this.fading.filter(({ output, from, volume }) => {
      const t = (now - from) / STOP_FADE_MS;
      if (t >= 1) {
        output.release();
        return false;
      }
      const left = 1 - t;
      output.setVolume(volume * left * left);
      return true;
    });
  }

  private startTicker() {
    this.stopTicker();
    this.ticker = this.setIntervalFn(() => this.tick('interval'), TICK_MS);
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
