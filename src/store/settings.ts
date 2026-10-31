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
      partialize: ({ volume, favorites, webTipDismissed }) => ({
        volume,
        favorites,
        webTipDismissed,
      }),
    },
  ),
);
