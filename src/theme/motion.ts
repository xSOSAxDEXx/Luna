import { useReducedMotion } from 'react-native-reanimated';

/**
 * Slow, soft motion. UI timings are in milliseconds; nothing bounces or flashes.
 * Audio fades live here too so every "softness" number is in one place.
 */
export const duration = {
  quick: 250, // press feedback
  gentle: 600, // most fades
  slow: 1200, // screen-level transitions, dim mode
  breath: 4000, // one inhale or exhale (ambient moon pulse)
} as const;

export const audioFade = {
  /** Fade-out when the sleep timer ends. Never a hard stop. */
  timerEndMs: 30_000,
  /** Crossfade between shuffle tracks. */
  crossfadeMs: 4_000,
  /** Fade-in when a sound starts. */
  startMs: 1_500,
} as const;

/** How long the player waits without a touch before dimming. */
export const DIM_AFTER_MS = 8_000;

/** Cubic-bezier control points; build curves with Easing.bezier(...easing.soft). */
export const easing = {
  soft: [0.4, 0, 0.2, 1],
} as const;

/**
 * Durations to use for UI animation. With the OS "reduce motion" setting on,
 * animations become instant and ambient loops (like the breathing moon) stop.
 * Audio fades are not affected; they are about sound, not motion.
 */
export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    duration: reduced ? ({ quick: 0, gentle: 0, slow: 0, breath: 0 } as const) : duration,
    ambient: !reduced,
  };
}
