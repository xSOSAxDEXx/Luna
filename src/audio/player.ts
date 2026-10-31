import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { logEvent } from '@/diagnostics/log';
import { useSettings } from '@/store/settings';

import { PlayerEngine, type PlayerSnapshot } from './engine';
import { createExpoOutput } from './expoOutput';

/** Heartbeats since the app was backgrounded, so diagnostics can show they kept coming. */
let heartbeats = 0;

/** The app's single player. Screens talk to it through the hooks below. */
export const player = new PlayerEngine({
  createOutput: (sound, events) =>
    createExpoOutput(sound, {
      ...events,
      onHeartbeat: () => {
        heartbeats++;
        events.onHeartbeat();
      },
    }),
  log: logEvent,
});

// Keep the engine's volume in step with the saved setting, including after
// the setting loads from storage.
player.setVolume(useSettings.getState().volume);
useSettings.subscribe((state, prev) => {
  if (state.volume !== prev.volume) player.setVolume(state.volume);
});

let backgroundSince: number | null = null;

// When the app comes back to the foreground, catch up immediately: the timer
// may have run out, or the fade moved on, while JS timers were paused.
AppState.addEventListener('change', (state) => {
  const playing = player.getSnapshot().status === 'playing';
  if (state === 'active') {
    if (backgroundSince != null) {
      logEvent('foreground', {
        awaySeconds: Math.round((Date.now() - backgroundSince) / 1000),
        heartbeats,
        status: player.getSnapshot().status,
      });
    }
    backgroundSince = null;
    player.tick('foreground');
  } else if (backgroundSince == null) {
    backgroundSince = Date.now();
    heartbeats = 0;
    logEvent('background', { state, playing, platform: Platform.OS });
  }
});

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
}
