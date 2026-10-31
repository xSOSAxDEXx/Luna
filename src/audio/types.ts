import type { CategoryKey } from '@/theme';

/** What the player engine needs from the audio library, so tests can fake it. */
export interface AudioOutput {
  play(): void;
  pause(): void;
  /** 0..1, applied immediately. */
  setVolume(volume: number): void;
  /** Lock screen / notification "now playing" info. */
  showNowPlaying(title: string): void;
  /** Stops and frees the native player. The output is unusable afterwards. */
  release(): void;
}

export type SoundCategory = Exclude<CategoryKey, 'mine'>;

/** The parts of a sound the engine needs to play it. */
export type PlayableSound = {
  id: string;
  name: string;
  /** A bundled asset (`require(...)`) or, later, a file URI for recordings. */
  source: number | string;
};

export type CreateOutput = (sound: PlayableSound) => AudioOutput;
