import type { PlayableSound, SoundCategory } from '@/audio/types';

export type SoundIcon =
  | 'waveform'
  | 'drop'
  | 'waves'
  | 'wind'
  | 'leaf'
  | 'moon'
  | 'heart'
  | 'fan'
  | 'car'
  | 'train'
  | 'note'
  | 'star'
  | 'book';

export type Sound = PlayableSound & {
  /** 'mine' is the parent's own recordings (My Sounds). */
  category: SoundCategory | 'mine';
  icon: SoundIcon;
  /**
   * Path under assets/sounds/. Every real (non-placeholder) file must have a
   * row in assets/sounds/LICENSES.md; a test enforces this.
   */
  file: string;
  /**
   * True for a sound whose real audio isn't ready yet: its card carries a
   * visible "Placeholder" tag. None are placeholders today.
   */
  placeholder: boolean;
  /** A colour the parent picked (recordings); otherwise the category's tint. */
  tint?: string;
};

export const CATEGORIES: { key: SoundCategory; title: string }[] = [
  { key: 'noise', title: 'Noise' },
  { key: 'nature', title: 'Nature' },
  { key: 'rhythmic', title: 'Rhythmic' },
  { key: 'music', title: 'Music' },
];

export const SOUNDS: Sound[] = [
  // Noise: generated in code (scripts/generate-noise.ts)
  {
    id: 'white-noise',
    name: 'White noise',
    category: 'noise',
    icon: 'waveform',
    file: 'noise/white-noise.wav',
    source: require('@/assets/sounds/noise/white-noise.wav'),
    placeholder: false,
  },
  {
    id: 'pink-noise',
    name: 'Pink noise',
    category: 'noise',
    icon: 'waveform',
    file: 'noise/pink-noise.wav',
    source: require('@/assets/sounds/noise/pink-noise.wav'),
    placeholder: false,
  },
  {
    id: 'brown-noise',
    name: 'Brown noise',
    category: 'noise',
    icon: 'waveform',
    file: 'noise/brown-noise.wav',
    source: require('@/assets/sounds/noise/brown-noise.wav'),
    placeholder: false,
  },

  // Nature, rhythmic and music: synthesised in code (src/audio/soundscapes.ts, music.ts)
  {
    id: 'rain',
    name: 'Rain',
    category: 'nature',
    icon: 'drop',
    file: 'nature/rain.wav',
    source: require('@/assets/sounds/nature/rain.wav'),
    placeholder: false,
  },
  {
    id: 'ocean-waves',
    name: 'Ocean waves',
    category: 'nature',
    icon: 'waves',
    file: 'nature/ocean-waves.wav',
    source: require('@/assets/sounds/nature/ocean-waves.wav'),
    placeholder: false,
  },
  {
    id: 'stream',
    name: 'Stream',
    category: 'nature',
    icon: 'waves',
    file: 'nature/stream.wav',
    source: require('@/assets/sounds/nature/stream.wav'),
    placeholder: false,
  },
  {
    id: 'wind',
    name: 'Wind',
    category: 'nature',
    icon: 'wind',
    file: 'nature/wind.wav',
    source: require('@/assets/sounds/nature/wind.wav'),
    placeholder: false,
  },
  {
    id: 'forest-night',
    name: 'Forest night',
    category: 'nature',
    icon: 'leaf',
    file: 'nature/forest-night.wav',
    source: require('@/assets/sounds/nature/forest-night.wav'),
    placeholder: false,
  },
  {
    id: 'crickets',
    name: 'Crickets',
    category: 'nature',
    icon: 'moon',
    file: 'nature/crickets.wav',
    source: require('@/assets/sounds/nature/crickets.wav'),
    placeholder: false,
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    category: 'rhythmic',
    icon: 'heart',
    file: 'rhythmic/heartbeat.wav',
    source: require('@/assets/sounds/rhythmic/heartbeat.wav'),
    placeholder: false,
  },
  {
    id: 'womb',
    name: 'Womb',
    category: 'rhythmic',
    icon: 'heart',
    file: 'rhythmic/womb.wav',
    source: require('@/assets/sounds/rhythmic/womb.wav'),
    placeholder: false,
  },
  {
    id: 'shushing',
    name: 'Shushing',
    category: 'rhythmic',
    icon: 'wind',
    file: 'rhythmic/shushing.wav',
    source: require('@/assets/sounds/rhythmic/shushing.wav'),
    placeholder: false,
  },
  {
    id: 'fan',
    name: 'Fan',
    category: 'rhythmic',
    icon: 'fan',
    file: 'rhythmic/fan.wav',
    source: require('@/assets/sounds/rhythmic/fan.wav'),
    placeholder: false,
  },
  {
    id: 'car-ride',
    name: 'Car ride',
    category: 'rhythmic',
    icon: 'car',
    file: 'rhythmic/car-ride.wav',
    source: require('@/assets/sounds/rhythmic/car-ride.wav'),
    placeholder: false,
  },
  {
    id: 'train',
    name: 'Train',
    category: 'rhythmic',
    icon: 'train',
    file: 'rhythmic/train.wav',
    source: require('@/assets/sounds/rhythmic/train.wav'),
    placeholder: false,
  },
  {
    id: 'lullaby',
    name: 'Lullaby',
    category: 'music',
    icon: 'note',
    file: 'music/lullaby.wav',
    source: require('@/assets/sounds/music/lullaby.wav'),
    placeholder: false,
  },
  {
    id: 'music-box',
    name: 'Music box',
    category: 'music',
    icon: 'star',
    file: 'music/music-box.wav',
    source: require('@/assets/sounds/music/music-box.wav'),
    placeholder: false,
  },
  {
    id: 'piano',
    name: 'Soft piano',
    category: 'music',
    icon: 'note',
    file: 'music/piano.wav',
    source: require('@/assets/sounds/music/piano.wav'),
    placeholder: false,
  },
  {
    id: 'harp',
    name: 'Gentle harp',
    category: 'music',
    icon: 'note',
    file: 'music/harp.wav',
    source: require('@/assets/sounds/music/harp.wav'),
    placeholder: false,
  },
];

const byId = new Map(SOUNDS.map((s) => [s.id, s]));

export function getSound(id: string): Sound | undefined {
  return byId.get(id);
}

/**
 * Wake-up sounds (CLAUDE.md §3.4): brighter sounds the sleep sound
 * crossfades into at the end of the timer. Not shown in the library.
 */
export type WakeSound = PlayableSound & { file: string; placeholder: boolean };

export const WAKE_SOUNDS: WakeSound[] = [
  // Generated in code (src/audio/chimes.ts, scripts/generate-noise.ts)
  {
    id: 'light-chimes',
    name: 'Light chimes',
    file: 'wake/light-chimes.wav',
    source: require('@/assets/sounds/wake/light-chimes.wav'),
    placeholder: false,
  },
  // Synthesised in code (src/audio/music.ts)
  {
    id: 'morning-birds',
    name: 'Morning birds',
    file: 'wake/morning-birds.wav',
    source: require('@/assets/sounds/wake/morning-birds.wav'),
    placeholder: false,
  },
  {
    id: 'playful-melody',
    name: 'Playful melody',
    file: 'wake/playful-melody.wav',
    source: require('@/assets/sounds/wake/playful-melody.wav'),
    placeholder: false,
  },
];

/** "Auto" picks this one: the gentlest of the wake-up sounds. */
export const AUTO_WAKE_SOUND_ID = 'light-chimes';

/** The wake-up sound for a setting: 'auto' or a sound id (unknown ids fall back to auto). */
export function resolveWakeSound(id: string): WakeSound {
  const wanted = id === 'auto' ? AUTO_WAKE_SOUND_ID : id;
  return (
    WAKE_SOUNDS.find((s) => s.id === wanted) ??
    WAKE_SOUNDS.find((s) => s.id === AUTO_WAKE_SOUND_ID)!
  );
}
