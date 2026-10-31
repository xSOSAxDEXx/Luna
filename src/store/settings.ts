import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_VOLUME } from '@/audio/engine';

/**
 * With the soft volume cap on (the default), the volume can't go above this
 * share of the device's volume (CLAUDE.md §3.8).
 */
export const SOFT_VOLUME_CAP = 0.6;

/** How often the "quiet your phone" card shows when a sound starts (CLAUDE.md §3.7). */
export type QuietReminder = 'always' | 'daily' | 'never';

export function clampVolume(volume: number, capped: boolean): number {
  return Math.min(capped ? SOFT_VOLUME_CAP : 1, Math.max(0, volume));
}

/**
 * Preferences kept on this device. Included in backup and restore.
 */
type SettingsState = {
  volume: number;
  favorites: string[];
  /** The web "use the app for all-night sound" tip was dismissed. */
  webTipDismissed: boolean;
  dismissWebTip: () => void;
  /** "Gentle wake-up at the end" (CLAUDE.md §3.4). Off by default. */
  wakeUpEnabled: boolean;
  /** 'auto' or a wake-up sound id. */
  wakeSoundId: string;
  setWakeUp: (patch: { enabled?: boolean; soundId?: string }) => void;
  setVolume: (volume: number) => void;
  /** Soft volume cap (on by default): keeps the volume at or below SOFT_VOLUME_CAP. */
  softVolumeCap: boolean;
  setSoftVolumeCap: (on: boolean) => void;
  /** "Quiet your phone" card: every time (default), once a day, or never. */
  quietReminder: QuietReminder;
  setQuietReminder: (value: QuietReminder) => void;
  /** Local date ("2026-10-31") the quiet card last showed, for "once a day". */
  quietShownOn: string;
  markQuietShown: (day: string) => void;
  /** The welcome (onboarding) has been seen. */
  onboarded: boolean;
  finishOnboarding: () => void;
  toggleFavorite: (soundId: string) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      volume: DEFAULT_VOLUME,
      favorites: [],
      webTipDismissed: false,
      dismissWebTip: () => set({ webTipDismissed: true }),
      wakeUpEnabled: false,
      wakeSoundId: 'auto',
      setWakeUp: ({ enabled, soundId }) =>
        set((state) => ({
          wakeUpEnabled: enabled ?? state.wakeUpEnabled,
          wakeSoundId: soundId ?? state.wakeSoundId,
        })),
      setVolume: (volume) => set((state) => ({ volume: clampVolume(volume, state.softVolumeCap) })),
      softVolumeCap: true,
      setSoftVolumeCap: (on) =>
        set((state) => ({ softVolumeCap: on, volume: clampVolume(state.volume, on) })),
      quietReminder: 'always',
      setQuietReminder: (quietReminder) => set({ quietReminder }),
      quietShownOn: '',
      markQuietShown: (quietShownOn) => set({ quietShownOn }),
      onboarded: false,
      finishOnboarding: () => set({ onboarded: true }),
      toggleFavorite: (soundId) =>
        set((state) => ({
          favorites: state.favorites.includes(soundId)
            ? state.favorites.filter((id) => id !== soundId)
            : [...state.favorites, soundId],
        })),
    }),
    {
      name: 'luna-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        volume,
        favorites,
        webTipDismissed,
        wakeUpEnabled,
        wakeSoundId,
        softVolumeCap,
        quietReminder,
        quietShownOn,
        onboarded,
      }) => ({
        volume,
        favorites,
        webTipDismissed,
        wakeUpEnabled,
        wakeSoundId,
        softVolumeCap,
        quietReminder,
        quietShownOn,
        onboarded,
      }),
    },
  ),
);
