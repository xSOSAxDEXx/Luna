import { type RecordingOptions, RecordingPresets } from 'expo-audio';

/**
 * Recorder settings for a parent's voice: AAC in an .m4a file, mono (one
 * voice, half the size), 96 kbps (clear singing; a 3-minute lullaby is
 * about 2 MB). Loudness levels are on, for the silence trim.
 */
export const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 96_000,
  isMeteringEnabled: true,
};

/** A take stops by itself at this length, so a forgotten recording can't fill the phone. */
export const MAX_RECORDING_MS = 20 * 60_000;

/** "0:07", "3:25", "12:00". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
