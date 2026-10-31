import type { TrimRange } from '@/recording/trim';
import type { CategoryKey } from '@/theme';

export type OutputEvents = {
  /**
   * Fires regularly while the sound is audible, driven by the audio system
   * itself. On Android, React Native pauses JS timers when the app is in the
   * background, so this is what keeps the sleep timer and fades running with
   * the screen off.
   */
  onHeartbeat: () => void;
  /**
   * Playback started or stopped without the app asking: lock-screen or
   * headphone buttons, a phone call, another app taking audio focus, or the
   * OS resuming after an interruption.
   */
  onExternalChange: (playing: boolean) => void;
};

/** What the player engine needs from the audio library, so tests can fake it. */
export interface AudioOutput {
  play(): void;
  pause(): void;
  /** 0..1, applied immediately. */
  setVolume(volume: number): void;
  /** Lock screen / notification "now playing" info. */
  showNowPlaying(title: string, subtitle: string): void;
  /** Stops and frees the native player. The output is unusable afterwards. */
  release(): void;
}

export type SoundCategory = Exclude<CategoryKey, 'mine'>;

/** The parts of a sound the engine needs to play it. */
export type PlayableSound = {
  id: string;
  name: string;
  /** A bundled asset (`require(...)`) or a file URI (the parent's recordings). */
  source: number | string;
  /**
   * Loop only this part of the file (a recording with its silence trimmed).
   * Absent: loop the whole file.
   */
  loopRange?: TrimRange;
};

export type CreateOutput = (sound: PlayableSound, events: OutputEvents) => AudioOutput;
