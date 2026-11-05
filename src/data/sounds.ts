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
  | 'book'
  | 'tone'
  | 'bowl';

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
  /** Harmony Tones: the frequency, shown as a small subtitle (e.g. "528 Hz"). */
  frequencyLabel?: string;
  /** Harmony Tones: "A432" when the music is tuned to A = 432 Hz. */
  tuning?: 'A432';
  /** Harmony Tones: one gentle line about the sound (player and info sheet). */
  description?: string;
};

export const CATEGORIES: { key: SoundCategory; title: string }[] = [
  { key: 'noise', title: 'Noise' },
  { key: 'nature', title: 'Nature' },
  { key: 'rhythmic', title: 'Rhythmic' },
  { key: 'music', title: 'Music' },
  { key: 'harmony', title: 'Harmony Tones' },
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
  // Harmony Tones: synthesised in code (src/audio/harmony.ts, music.ts)
  {
    id: 'harmony-174',
    name: 'Deep Calm',
    category: 'harmony',
    icon: 'tone',
    file: 'harmony/harmony-174.wav',
    source: require('@/assets/sounds/harmony/harmony-174.wav'),
    placeholder: false,
    frequencyLabel: '174 Hz',
    description: 'A deep, grounding hum',
  },
  {
    id: 'harmony-396',
    name: 'Gentle Release',
    category: 'harmony',
    icon: 'tone',
    file: 'harmony/harmony-396.wav',
    source: require('@/assets/sounds/harmony/harmony-396.wav'),
    placeholder: false,
    frequencyLabel: '396 Hz',
    description: 'Soft and steady',
  },
  {
    id: 'harmony-528',
    name: 'Heart Tone',
    category: 'harmony',
    icon: 'tone',
    file: 'harmony/harmony-528.wav',
    source: require('@/assets/sounds/harmony/harmony-528.wav'),
    placeholder: false,
    frequencyLabel: '528 Hz',
    description: 'The most popular Solfeggio tone, softened',
  },
  {
    id: 'harmony-639',
    name: 'Together',
    category: 'harmony',
    icon: 'tone',
    file: 'harmony/harmony-639.wav',
    source: require('@/assets/sounds/harmony/harmony-639.wav'),
    placeholder: false,
    frequencyLabel: '639 Hz',
    description: 'Warm and close',
  },
  {
    id: 'lullaby-432-musicbox',
    name: 'Music Box',
    category: 'harmony',
    icon: 'star',
    file: 'harmony/lullaby-432-musicbox.wav',
    source: require('@/assets/sounds/harmony/lullaby-432-musicbox.wav'),
    placeholder: false,
    frequencyLabel: '432 Hz',
    tuning: 'A432',
    description: 'A classic lullaby, tuned a little lower',
  },
  {
    id: 'lullaby-432-piano',
    name: 'Slow Piano',
    category: 'harmony',
    icon: 'note',
    file: 'harmony/lullaby-432-piano.wav',
    source: require('@/assets/sounds/harmony/lullaby-432-piano.wav'),
    placeholder: false,
    frequencyLabel: '432 Hz',
    tuning: 'A432',
    description: 'Slow, simple, predictable',
  },
  {
    id: 'bowl-soft',
    name: 'Singing Bowl',
    category: 'harmony',
    icon: 'bowl',
    file: 'harmony/bowl-soft.wav',
    source: require('@/assets/sounds/harmony/bowl-soft.wav'),
    placeholder: false,
    frequencyLabel: '216 Hz',
    tuning: 'A432',
    description: 'Gentle rings that fade slowly',
  },
  {
    id: 'om-drone',
    name: 'Om Drone',
    category: 'harmony',
    icon: 'tone',
    file: 'harmony/om-drone.wav',
    source: require('@/assets/sounds/harmony/om-drone.wav'),
    placeholder: false,
    frequencyLabel: '136.1 Hz',
    description: 'A low, hummed tone',
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
