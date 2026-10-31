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
  | 'star';

export type Sound = PlayableSound & {
  category: SoundCategory;
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
