import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, space, useMotion } from '@/theme';

import { AppText } from './AppText';
import { BreathingMoon } from './BreathingMoon';

/**
 * Dim mode (CLAUDE.md §4): after a few seconds without a touch, the player
 * fades to a near-black screen with just the moon and the time left. Any
 * tap brings the player back.
 */
export function DimOverlay({ label, onWake }: { label: string; onWake: () => void }) {
  const { duration } = useMotion();
  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={duration.slow ? FadeIn.duration(duration.slow) : undefined}
      exiting={duration.gentle ? FadeOut.duration(duration.gentle) : undefined}>
      <Pressable
        onPress={onWake}
        accessibilityRole="button"
        accessibilityLabel={`Screen dimmed, ${label}. Tap to wake the screen.`}
        style={styles.dim}>
        <BreathingMoon size={72} />
        <AppText variant="title" style={styles.time}>
          {label}
        </AppText>
        <AppText variant="caption" style={styles.hint}>
          Tap to wake the screen
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  // A low glow, not bright text, on the near-black screen.
  time: { color: colors.textMuted, opacity: 0.8 },
  hint: { color: colors.textMuted, opacity: 0.5 },
});
