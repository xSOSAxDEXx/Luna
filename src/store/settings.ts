import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_VOLUME } from '@/audio/engine';

/**
 * Preferences kept on this device. Backup and restore (step 6) will export
 * and import this store.
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
      setVolume: (volume) => set({ volume }),
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
      partialize: ({ volume, favorites, webTipDismissed, wakeUpEnabled, wakeSoundId }) => ({
        volume,
        favorites,
        webTipDismissed,
        wakeUpEnabled,
        wakeSoundId,
      }),
    },
  ),
);
