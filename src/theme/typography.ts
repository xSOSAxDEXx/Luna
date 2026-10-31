import type { TextStyle } from 'react-native';

/**
 * Nunito: rounded and friendly. Loaded in src/app/_layout.tsx.
 * Sizes stay unscaled here; React Native applies the user's dynamic type
 * setting on top (allowFontScaling is left on everywhere).
 */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

export const type = {
  timer: { fontFamily: fontFamily.semibold, fontSize: 56, lineHeight: 64, letterSpacing: 1 },
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 26 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
