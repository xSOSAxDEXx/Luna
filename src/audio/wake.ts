import { MINUTE } from './timer';

/**
 * Gentle wake-up (CLAUDE.md §3.4). When the sleep timer ends, the sleep
 * sound crossfades into a brighter wake-up sound, which then rises slowly
 * from a low volume over five minutes.
 */

/** Length of the wake-up phase, after the sleep timer ends. */
export const WAKE_MS = 5 * MINUTE;
/**
 * Where the wake-up sound starts, as a share of the chosen volume. It
 * never goes above the chosen volume.
 */
export const WAKE_START_GAIN = 0.15;

/**
 * The wake-up sound's level during the sleep sound's last `crossfadeMs`:
 * from silence to WAKE_START_GAIN as the sleep sound fades out.
 */
export function wakeCrossfadeGain(sleepRemainingMs: number, crossfadeMs: number): number {
  if (sleepRemainingMs >= crossfadeMs) return 0;
  const t = 1 - Math.max(0, sleepRemainingMs) / crossfadeMs;
  return WAKE_START_GAIN * t;
}

/**
 * The wake-up sound's level during the wake-up phase: rises slowly (eased,
 * so the first minutes stay soft) from WAKE_START_GAIN to the full chosen
 * volume.
 */
export function wakeRiseGain(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / WAKE_MS));
  return WAKE_START_GAIN + (1 - WAKE_START_GAIN) * t * t;
}
