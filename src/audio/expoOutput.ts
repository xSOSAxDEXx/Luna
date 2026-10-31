import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { AudioOutput, PlayableSound } from './types';

let audioModeReady: Promise<void> | null = null;

/**
 * One-time audio session setup:
 * - plays even with the ringer switch on silent (parents are told to silence
 *   their phone, and the sound must keep going),
 * - keeps playing in the background and with the screen locked,
 * - takes exclusive audio focus, which lock-screen controls require.
 */
export function configureAudioSession(): Promise<void> {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch((error: unknown) => {
    audioModeReady = null;
    console.warn('Could not configure the audio session', error);
  });
  return audioModeReady;
}

/** An `AudioOutput` backed by expo-audio. Each sound gets its own player. */
export function createExpoOutput(sound: PlayableSound): AudioOutput {
  void configureAudioSession();
  const player = createAudioPlayer(sound.source, {
    updateInterval: 1000,
    keepAudioSessionActive: true,
  });
  player.loop = true;
  let released = false;

  return {
    play: () => !released && player.play(),
    pause: () => !released && player.pause(),
    setVolume: (volume) => {
      if (!released) player.volume = volume;
    },
    showNowPlaying: (title) => {
      // Android needs this for playback to continue past ~3 minutes in the
      // background. Step 3 verifies it (and the iOS lock screen) on devices.
      try {
        player.setActiveForLockScreen(true, { title, artist: 'Luna Beats' });
      } catch (error) {
        console.warn('Lock screen controls unavailable', error);
      }
    },
    release: () => {
      if (released) return;
      released = true;
      try {
        player.clearLockScreenControls();
      } catch {
        // Not active for the lock screen; nothing to clear.
      }
      player.pause();
      player.remove();
    },
  };
}
