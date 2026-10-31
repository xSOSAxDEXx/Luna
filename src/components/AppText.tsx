import { Text, type TextProps } from 'react-native';

import { colors, type TypeVariant, type } from '@/theme';

type Tone = 'primary' | 'secondary' | 'muted' | 'moon' | 'lavender';

const toneColor: Record<Tone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  moon: colors.moon,
  lavender: colors.lavender,
};

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  tone?: Tone;
};

/**
 * How far each size may grow with the phone's text-size setting (dynamic
 * type). Body text grows freely; the already-large timer and titles grow
 * less, so they still fit inside the ring and across the screen.
 */
const maxScale: Partial<Record<TypeVariant, number>> = { timer: 1.3, title: 1.6 };

/** All text in the app goes through this so fonts and colours stay consistent. */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxScale[variant]}
      {...rest}
      style={[type[variant], { color: toneColor[tone] }, style]}
    />
  );
}
