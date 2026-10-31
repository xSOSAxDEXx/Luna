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

/** All text in the app goes through this so fonts and colours stay consistent. */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[type[variant], { color: toneColor[tone] }, style]} />;
}
