import { audioFade } from '@/theme/motion';

import {
  crossfadeGains,
  MAX_MIX_LAYERS,
  type Program,
  programTitle,
  SHUFFLE_TRACK_MS,
  shuffleOrder,
  single,
} from './program';
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
  /** What's playing: a single sound, a mix or a shuffle set. */
  program: Program | null;
  /** The main sound right now (the only one, a mix's first layer, or shuffle's current). */
  sound: PlayableSound | null;
  /** Name to show: the sound, mix or shuffle set. */
  title: string;
  timer: SleepTimer | null;
  /** The listener's chosen volume, 0..1, before any fade. */
  volume: number;
  /**
   * Paused by something outside the app (a call, another app's audio, the
   * lock screen). The player gently offers to resume.
   */
  pausedExternally: boolean;
  /** Increases every time a sound is started, so screens can react to each new start. */
  sessionId: number;
};

export type EngineLog = (event: string, detail?: Record<string, unknown>) => void;

export type EngineDeps = {
  createOutput: CreateOutput;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  /** For shuffle order; injectable so tests are repeatable. */
  random?: () => number;
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

/** One playing sound: its output plus its place in the program. */
type Voice = {
  output: AudioOutput;
  sound: PlayableSound;
  /** Index into a mix's layers (for its volume); 0 otherwise. */
  layer: number;
  /** Shuffle crossfade level, 0..1. */
  env: number;
};

type FadingOutput = { output: AudioOutput; from: number; volume: number };

const EMPTY: Omit<PlayerSnapshot, 'volume' | 'sessionId'> = {
  status: 'idle',
  program: null,
  sound: null,
  title: '',
  timer: null,
  pausedExternally: false,
};

/**
 * Plays a program (one sound, a mix, or a shuffle set) on a sleep timer.
 *
 * All timing comes from `now()` (wall-clock), and every tick recomputes each
 * sound's volume from scratch, so a late or skipped tick never leaves a fade,
 * crossfade or the timer out of step.
 *
 * Ticks come from two places: a JS interval (smooth while the app is open)
 * and heartbeats from the audio outputs (which keep coming when the app is in
 * the background and JS timers are paused). Ticking is idempotent, so having
 * both is harmless.
 */
export class PlayerEngine {
  /** Audible voices. voices[0] is the main one (lock screen, outside events). */
  private voices: Voice[] = [];
  /** Shuffle: the next sound while it crossfades in. */
  private incoming: Voice | null = null;
  private ticker: unknown = null;
  /** When the current fade-in began (start or resume). */
  private fadeInFrom = 0;
  private lastTickAt = 0;
  /** The lock-screen subtitle last sent, so it's only updated when it changes. */
  private nowPlayingText = '';
  private fading: FadingOutput[] = [];
  /** Play clock (excludes pauses), for shuffle timing. */
  private playAnchor = 0;
  private pausedPlayMs = 0;
  /** Shuffle: play order, position in it, and when the current track began (play clock). */
  private order: PlayableSound[] = [];
  private orderIndex = 0;
  private trackStart = 0;
  private listeners = new Set<(s: PlayerSnapshot) => void>();
  private snapshot: PlayerSnapshot = { ...EMPTY, volume: DEFAULT_VOLUME, sessionId: 0 };

  private readonly createOutput: CreateOutput;
  private readonly now: () => number;
  private readonly setIntervalFn: (fn: () => void, ms: number) => unknown;
  private readonly clearIntervalFn: (handle: unknown) => void;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => unknown;
  private readonly random: () => number;
  private readonly log: EngineLog;

  constructor(deps: EngineDeps) {
    this.createOutput = deps.createOutput;
    this.now = deps.now ?? (() => Date.now());
    this.setIntervalFn = deps.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this.clearIntervalFn =
      deps.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
    this.setTimeoutFn = deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.random = deps.random ?? Math.random;
    this.log = deps.log ?? (() => {});
  }

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  subscribe = (listener: (s: PlayerSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Starts a sound (or a mix / shuffle program) with a fresh timer, 10
   * minutes unless told otherwise.
   */
  start(what: PlayableSound | Program, minutes: number | 'untilStop' = DEFAULT_TIMER_MINUTES) {
    const program = 'kind' in what ? normalize(what) : single(what);
    if (!program) return; // an empty mix or shuffle set: nothing to play
    this.fadeAndReleaseAll();
    const now = this.now();
    const timer = minutes === 'untilStop' ? untilStop : countdown(now, minutes);

    if (program.kind === 'mix') {
      this.voices = program.layers.map((l, i) => this.createVoice(l.sound, i));
    } else if (program.kind === 'shuffle') {
      this.order = shuffleOrder(program.sounds, this.random);
      this.orderIndex = 0;
      this.trackStart = 0;
      this.voices = [this.createVoice(this.order[0], 0)];
    } else {
      this.voices = [this.createVoice(program.sound, 0)];
    }

    this.fadeInFrom = now;
    this.lastTickAt = now;
    this.playAnchor = now;
    this.pausedPlayMs = 0;
    this.update({
      status: 'playing',
      program,
      sound: this.voices[0].sound,
      title: programTitle(program),
      timer,
      pausedExternally: false,
      sessionId: this.snapshot.sessionId + 1,
    });
    this.nowPlayingText = '';
    for (const v of this.voices) {
      v.output.setVolume(0);
      v.output.play();
    }
    this.log('start', { kind: program.kind, sounds: this.voices.map((v) => v.sound.id), minutes });
    this.startTicker();
    this.tick();
  }

  pause() {
    if (this.snapshot.status !== 'playing' || !this.snapshot.timer) return;
    const now = this.now();
    for (const v of this.allVoices()) v.output.pause();
    this.stopTicker();
    this.pausedPlayMs = now - this.playAnchor;
    this.update({ status: 'paused', timer: pauseTimer(this.snapshot.timer, now) });
    this.log('pause');
  }

  resume() {
    if (this.snapshot.status !== 'paused' || !this.snapshot.timer) return;
    const now = this.now();
    this.fadeInFrom = now;
    this.lastTickAt = now;
    this.playAnchor = now - this.pausedPlayMs;
    for (const v of this.allVoices()) {
      v.output.setVolume(0);
      v.output.play();
    }
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
    this.fadeAndReleaseAll();
    this.update({ ...EMPTY });
    this.log('stop');
  }

  /**
   * Quick-add. After the timer has finished, adding time plays the same
   * program again for that long.
   */
  addMinutes(minutes: number) {
    const { status, program, timer } = this.snapshot;
    if (status === 'finished' && program) {
      this.start(program, minutes);
      return;
    }
    if (!timer) return;
    this.update({ timer: addTimerMinutes(timer, minutes, this.now()) });
    this.log('add-minutes', { minutes });
    this.tick();
  }

  /** "Until I stop": no timer at all. */
  playUntilStopped() {
    const { status, program, timer } = this.snapshot;
    if (status === 'finished' && program) {
      this.start(program, 'untilStop');
      return;
    }
    if (!timer) return;
    this.update({ timer: untilStop });
    this.log('until-stop');
    this.tick();
  }

  setVolume(volume: number) {
    this.update({ volume: clamp01(volume) });
    this.tick();
  }

  /** Changes one layer's volume in the mix that's playing. */
  setLayerVolume(layer: number, volume: number) {
    const { program } = this.snapshot;
    if (program?.kind !== 'mix' || !program.layers[layer]) return;
    const layers = program.layers.map((l, i) =>
      i === layer ? { ...l, volume: clamp01(volume) } : l,
    );
    this.update({ program: { ...program, layers } });
    this.tick();
  }

  /**
   * Re-evaluates volumes, the timer, shuffle crossfades, the lock-screen
   * text and any stop fades. Called by the ticker, by output heartbeats, and
   * when the app returns to the foreground.
   */
  tick = (source: 'interval' | 'heartbeat' | 'foreground' | 'action' = 'action') => {
    const now = this.now();
    this.advanceFades(now);

    const { status, timer, program } = this.snapshot;
    if (status !== 'playing' || !timer || !program || this.voices.length === 0) return;

    const gap = now - this.lastTickAt;
    if (gap > TICK_GAP_LOG_MS) this.log('tick-gap', { ms: gap, source });
    this.lastTickAt = now;

    if (isExpired(timer, now)) {
      this.finish(now);
      return;
    }
    if (program.kind === 'shuffle') this.advanceShuffle(now);
    this.applyVolumes(now);
    this.updateNowPlaying(now);
  };

  // ---- internals ----

  private allVoices(): Voice[] {
    return this.incoming ? [...this.voices, this.incoming] : this.voices;
  }

  private isLive(voice: Voice) {
    return this.voices.includes(voice) || this.incoming === voice;
  }

  private createVoice(sound: PlayableSound, layer: number): Voice {
    const voice: Voice = { sound, layer, env: 1, output: null as unknown as AudioOutput };
    voice.output = this.createOutput(sound, {
      onHeartbeat: () => {
        // Sounds fading out after Stop still send heartbeats; they move the
        // fade on.
        if (this.isLive(voice)) this.tick('heartbeat');
        else this.advanceFades(this.now());
      },
      onExternalChange: (playing) => {
        // Only the main sound owns the lock screen and speaks for the program.
        if (this.voices[0] === voice) this.handleExternalChange(playing);
      },
    });
    return voice;
  }

  /** The overall gain before per-layer volume: volume × fade-in × timer fade-out. */
  private masterGain(now: number) {
    const { volume, timer } = this.snapshot;
    return (
      volume *
      fadeInGain(now - this.fadeInFrom, audioFade.startMs) *
      (timer ? fadeOutGain(remainingMs(timer, now), audioFade.timerEndMs) : 1)
    );
  }

  private layerGain(voice: Voice) {
    const { program } = this.snapshot;
    return program?.kind === 'mix' ? (program.layers[voice.layer]?.volume ?? 0) : 1;
  }

  private applyVolumes(now: number) {
    const master = this.masterGain(now);
    for (const v of this.allVoices()) v.output.setVolume(master * this.layerGain(v) * v.env);
  }

  private playMs(now: number) {
    return this.snapshot.status === 'playing' ? now - this.playAnchor : this.pausedPlayMs;
  }

  /**
   * Shuffle: in the last few seconds of each track, start the next sound and
   * crossfade; at the end of the track, it takes over. Worked out from the
   * play clock, so a long gap between ticks just catches up.
   */
  private advanceShuffle(now: number) {
    const xfade = audioFade.crossfadeMs;
    const played = this.playMs(now);

    // A long gap (e.g. a suspended app): skip whole tracks without creating
    // a player for each one.
    const skipped = Math.floor((played - this.trackStart) / SHUFFLE_TRACK_MS) - 1;
    if (skipped > 0) {
      // A half-started crossfade belongs to a track we've now skipped.
      this.incoming?.output.release();
      this.incoming = null;
      this.trackStart += skipped * SHUFFLE_TRACK_MS;
      for (let i = 0; i < skipped; i++) this.nextInOrder();
    }

    let pos = played - this.trackStart;
    if (pos >= SHUFFLE_TRACK_MS - xfade && !this.incoming) {
      this.incoming = this.createVoice(this.peekNext(), 0);
      this.incoming.env = 0;
      this.incoming.output.setVolume(0);
      this.incoming.output.play();
    }
    if (pos >= SHUFFLE_TRACK_MS && this.incoming) {
      const outgoing = this.voices[0];
      outgoing.output.release();
      this.voices = [this.incoming];
      this.incoming = null;
      this.voices[0].env = 1;
      this.nextInOrder();
      this.trackStart += SHUFFLE_TRACK_MS;
      pos -= SHUFFLE_TRACK_MS;
      this.nowPlayingText = '';
      this.update({ sound: this.voices[0].sound });
      this.log('shuffle-next', { sound: this.voices[0].sound.id });
    }

    if (this.incoming) {
      const [out, inc] = crossfadeGains((pos - (SHUFFLE_TRACK_MS - xfade)) / xfade);
      this.voices[0].env = out;
      this.incoming.env = inc;
    } else {
      this.voices[0].env = 1;
    }
  }

  private peekNext(): PlayableSound {
    if (this.orderIndex + 1 < this.order.length) return this.order[this.orderIndex + 1];
    // End of the order: reshuffle, without repeating the sound just played.
    const program = this.snapshot.program;
    const sounds = program?.kind === 'shuffle' ? program.sounds : this.order;
    const current = this.order[this.orderIndex];
    this.order = [current, ...shuffleOrder(sounds, this.random, current?.id)];
    this.orderIndex = 0;
    return this.order[1];
  }

  private nextInOrder() {
    this.peekNext();
    this.orderIndex++;
  }

  private updateNowPlaying(now: number) {
    const { timer, title, program, sound } = this.snapshot;
    if (!timer || !sound) return;
    const left = formatRemaining(timer, now);
    const text = program?.kind === 'shuffle' ? `${sound.name} · ${left}` : left;
    if (text !== this.nowPlayingText) {
      this.nowPlayingText = text;
      this.voices[0].output.showNowPlaying(title, text);
    }
  }

  private handleExternalChange(playing: boolean) {
    const { status, timer } = this.snapshot;
    if (!timer) return;
    const now = this.now();
    const others = this.allVoices().slice(1);
    if (!playing && status === 'playing') {
      // The OS (or the lock screen) paused the main sound; pause the other
      // layers with it and hold the timer so a call doesn't eat sleep time.
      for (const v of others) v.output.pause();
      this.stopTicker();
      this.pausedPlayMs = now - this.playAnchor;
      this.update({ status: 'paused', timer: pauseTimer(timer, now), pausedExternally: true });
      this.log('external-pause');
    } else if (playing && status === 'paused') {
      // Resumed from the lock screen, or by the OS after a call. It's already
      // audible, so skip the fade-in; bring the other layers back with it.
      for (const v of others) v.output.play();
      this.fadeInFrom = now - audioFade.startMs;
      this.lastTickAt = now;
      this.playAnchor = now - this.pausedPlayMs;
      this.update({ status: 'playing', timer: resumeTimer(timer, now), pausedExternally: false });
      this.log('external-resume');
      this.startTicker();
      this.tick();
    }
  }

  /** The timer ran out. The fade has already brought the volume to zero. */
  private finish(now: number) {
    this.stopTicker();
    for (const v of this.allVoices()) {
      v.output.setVolume(0);
      v.output.release();
    }
    this.voices = [];
    this.incoming = null;
    const timer = this.snapshot.timer;
    this.update({ status: 'finished' });
    // How late the stop was compared with the timer's end, for diagnostics.
    this.log('finish', timer?.kind === 'countdown' ? { lateMs: now - timer.endsAt } : {});
  }

  /**
   * Fades every voice out over STOP_FADE_MS, then releases them. Steps run on
   * timeouts and on heartbeats, so the fade completes even if the app is
   * backgrounded straight after tapping Stop.
   */
  private fadeAndReleaseAll() {
    const voices = this.allVoices();
    const playing = this.snapshot.status === 'playing';
    const now = this.now();
    const master = playing ? this.masterGain(now) : 0;
    for (const v of voices) {
      if (!playing) v.output.release();
      // Start each fade from what's audible now (it may already be mid-fade).
      else
        this.fading.push({
          output: v.output,
          from: now,
          volume: master * this.layerGain(v) * v.env,
        });
    }
    this.voices = [];
    this.incoming = null;
    if (!playing || voices.length === 0) return;
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

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Keeps programs within limits: at most three mix layers, and a shuffle of
 * one sound is just that sound looping.
 */
function normalize(program: Program): Program | null {
  if (program.kind === 'mix') {
    const layers = program.layers.slice(0, MAX_MIX_LAYERS);
    if (layers.length === 0) return null;
    return layers.length === 1 && !program.id ? single(layers[0].sound) : { ...program, layers };
  }
  if (program.kind === 'shuffle') {
    if (program.sounds.length === 0) return null;
    if (program.sounds.length === 1) return single(program.sounds[0]);
  }
  return program;
}
