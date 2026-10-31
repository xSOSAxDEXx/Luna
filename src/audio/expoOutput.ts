import { type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { AudioOutput, OutputEvents, PlayableSound } from './types';

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

/** Native status updates double as the background heartbeat. */
const STATUS_INTERVAL_MS = 500;
/**
 * After the app itself calls play() or pause(), status updates can lag for a
 * moment. Mismatches inside this window are ours, not external.
 */
const COMMAND_SETTLE_MS = 1_500;

/**
 * Decides whether a status update means something outside the app started or
 * stopped playback. Pure, so it can be tested without a device.
 */
export function createExternalChangeDetector(now: () => number = () => Date.now()) {
  let intended = false;
  let commandAt = -Infinity;
  return {
    /** The app asked for play (true) or pause (false). */
    command(playing: boolean) {
      intended = playing;
      commandAt = now();
    },
    /** Returns the new state if this update is an external change, else null. */
    check(status: Pick<AudioStatus, 'playing' | 'isBuffering' | 'isLoaded'>): boolean | null {
      if (!status.isLoaded || status.isBuffering) return null;
      if (now() - commandAt < COMMAND_SETTLE_MS) return null;
      if (status.playing === intended) return null;
      intended = status.playing;
      return status.playing;
    },
  };
}

/** An `AudioOutput` backed by expo-audio. Each sound gets its own player. */
export function createExpoOutput(sound: PlayableSound, events: OutputEvents): AudioOutput {
  void configureAudioSession();
  const player = createAudioPlayer(sound.source, {
    updateInterval: STATUS_INTERVAL_MS,
    keepAudioSessionActive: true,
  });
  player.loop = true;
  let released = false;
  let lockScreenActive = false;
  const detector = createExternalChangeDetector();

  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (released) return;
    const external = detector.check(status);
    if (external != null) events.onExternalChange(external);
    if (status.playing) events.onHeartbeat();
  });

  return {
    play: () => {
      if (released) return;
      detector.command(true);
      player.play();
    },
    pause: () => {
      if (released) return;
      detector.command(false);
      player.pause();
    },
    setVolume: (volume) => {
      if (!released) player.volume = volume;
    },
    showNowPlaying: (title, subtitle) => {
      if (released) return;
      const metadata = { title, artist: subtitle, albumTitle: 'Luna Beats' };
      try {
        if (lockScreenActive) {
          player.updateLockScreenMetadata(metadata);
        } else {
          // Required on Android for playback to continue past ~3 minutes in
          // the background. `isLiveStream` hides the scrub bar, which would
          // otherwise show the position inside a short loop.
          player.setActiveForLockScreen(true, metadata, { isLiveStream: true });
          lockScreenActive = true;
        }
      } catch (error) {
        console.warn('Lock screen controls unavailable', error);
      }
    },
    release: () => {
      if (released) return;
      released = true;
      subscription.remove();
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
