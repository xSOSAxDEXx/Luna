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
   * True while the real sound hasn't been sourced. These play the shared
   * placeholder loop and carry a visible "Placeholder" tag.
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

const PLACEHOLDER_FILE = 'placeholder/PLACEHOLDER.wav';
const PLACEHOLDER_SOURCE = require('@/assets/sounds/placeholder/PLACEHOLDER.wav');

function placeholder(id: string, name: string, category: SoundCategory, icon: SoundIcon): Sound {
  return {
    id,
    name,
    category,
    icon,
    file: PLACEHOLDER_FILE,
    source: PLACEHOLDER_SOURCE,
    placeholder: true,
  };
}

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

  // Nature
  placeholder('rain', 'Rain', 'nature', 'drop'),
  placeholder('ocean-waves', 'Ocean waves', 'nature', 'waves'),
  placeholder('stream', 'Stream', 'nature', 'waves'),
  placeholder('wind', 'Wind', 'nature', 'wind'),
  placeholder('forest-night', 'Forest night', 'nature', 'leaf'),
  placeholder('crickets', 'Crickets', 'nature', 'moon'),

  // Rhythmic
  placeholder('heartbeat', 'Heartbeat', 'rhythmic', 'heart'),
  placeholder('womb', 'Womb', 'rhythmic', 'heart'),
  placeholder('shushing', 'Shushing', 'rhythmic', 'wind'),
  placeholder('fan', 'Fan', 'rhythmic', 'fan'),
  placeholder('car-ride', 'Car ride', 'rhythmic', 'car'),
  placeholder('train', 'Train', 'rhythmic', 'train'),

  // Music
  placeholder('lullaby', 'Lullaby', 'music', 'note'),
  placeholder('music-box', 'Music box', 'music', 'star'),
  placeholder('piano', 'Soft piano', 'music', 'note'),
  placeholder('harp', 'Gentle harp', 'music', 'note'),
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
  {
    id: 'morning-birds',
    name: 'Morning birds',
    file: PLACEHOLDER_FILE,
    source: PLACEHOLDER_SOURCE,
    placeholder: true,
  },
  {
    id: 'playful-melody',
    name: 'Playful melody',
    file: PLACEHOLDER_FILE,
    source: PLACEHOLDER_SOURCE,
    placeholder: true,
  },
];

/** "Auto" picks this one. Light chimes is the only real wake-up sound so far. */
export const AUTO_WAKE_SOUND_ID = 'light-chimes';

/** The wake-up sound for a setting: 'auto' or a sound id (unknown ids fall back to auto). */
export function resolveWakeSound(id: string): WakeSound {
  const wanted = id === 'auto' ? AUTO_WAKE_SOUND_ID : id;
  return (
    WAKE_SOUNDS.find((s) => s.id === wanted) ??
    WAKE_SOUNDS.find((s) => s.id === AUTO_WAKE_SOUND_ID)!
  );
}
