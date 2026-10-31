/**
 * Night palette (the default and, for now, only theme).
 *
 * Rules from the brief: deep dusk indigo, lavender and moon-gold accents,
 * a low glow rather than bright white, and no pure white or bright blue.
 * `src/theme/__tests__/colors.test.ts` checks these rules.
 */
export const night = {
  // Surfaces, darkest to lightest
  dim: '#05060F', // dim mode (near black)
  skyDeep: '#0E1029',
  sky: '#14173A', // app background
  surface: '#1C1F45',
  surfaceRaised: '#262A57',
  border: '#343970',

  // Text
  text: '#ECE6F6', // soft cream-lavender, never pure white
  textSecondary: '#B4ADD3',
  textMuted: '#9A94BE',

  // Accents
  lavender: '#B8A9E8',
  lavenderSoft: '#8E7CC3',
  moon: '#F2D59B',
  moonDeep: '#DDB06A',
  onMoon: '#1B1A33', // text/icons placed on a moon-gold fill

  // Sound category tints (card backgrounds use these at low opacity)
  category: {
    noise: '#9AA3D8', // dusty periwinkle
    nature: '#93C9AE', // sage
    rhythmic: '#E3AFA6', // dusty rose
    music: '#CDB1EC', // lilac
    mine: '#F2D59B', // moon gold, for the parent's own recordings
  },
} as const;

export type Palette = typeof night;
export type CategoryKey = keyof Palette['category'];

export const colors: Palette = night;
