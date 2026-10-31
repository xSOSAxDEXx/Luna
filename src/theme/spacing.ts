export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** Smallest touch target anywhere in the app (one-handed, in the dark). */
export const MIN_TAP = 56;

/** Content never stretches wider than this on tablets and desktop web. */
export const MAX_CONTENT_WIDTH = 720;
