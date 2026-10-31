import { Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  /** Primary is moon gold, for the one main action on a screen. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Fill the row's free space (for buttons side by side). */
  grow?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** A big, soft, pill-shaped button. */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  grow,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        grow && styles.grow,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <AppText variant="label" style={primary && styles.primaryText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  primary: { backgroundColor: colors.moon },
  primaryText: { color: colors.onMoon },
  grow: { flex: 1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
