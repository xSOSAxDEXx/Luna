import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/store/settings';

import { PlayerEngine, type PlayerSnapshot } from './engine';
import { createExpoOutput } from './expoOutput';

/** The app's single player. Screens talk to it through the hooks below. */
export const player = new PlayerEngine({ createOutput: createExpoOutput });

// Keep the engine's volume in step with the saved setting, including after
// the setting loads from storage.
player.setVolume(useSettings.getState().volume);
useSettings.subscribe((state, prev) => {
  if (state.volume !== prev.volume) player.setVolume(state.volume);
});

// When the app comes back to the foreground, catch up immediately: the timer
// may have run out, or the fade moved on, while ticks were throttled.
AppState.addEventListener('change', (state) => {
  if (state === 'active') player.tick();
});

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
}
