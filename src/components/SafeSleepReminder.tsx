import { Pressable, StyleSheet, View } from 'react-native';

import { SAFE_SLEEP } from '@/safety/safeSleep';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  /** Shows the "I understand" button. Settings shows the guidance without it. */
  onAcknowledge?: () => void;
};

/**
 * Safe-sleep guidance. Calm in tone, but clearly set apart (moon-gold edge)
 * so it isn't mistaken for a passing tip. Screen readers announce it.
 */
export function SafeSleepReminder({ onAcknowledge }: Props) {
  return (
    <View
      style={styles.card}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${SAFE_SLEEP.title}. ${SAFE_SLEEP.points.join(' ')}`}>
      <AppText variant="bodyStrong" tone="moon">
        {SAFE_SLEEP.title}
      </AppText>
      {SAFE_SLEEP.points.map((point) => (
        <View key={point} style={styles.point}>
          <AppText variant="caption" tone="moon" style={styles.bullet}>
            •
          </AppText>
          <AppText variant="caption" style={styles.pointText}>
            {point}
          </AppText>
        </View>
      ))}
      {onAcknowledge ? (
        <Pressable
          onPress={onAcknowledge}
          accessibilityRole="button"
          accessibilityLabel={SAFE_SLEEP.acknowledge}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <AppText variant="label" style={styles.buttonText}>
            {SAFE_SLEEP.acknowledge}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.moonDeep,
    padding: space.md,
    gap: space.sm,
  },
  point: { flexDirection: 'row', gap: space.sm },
  bullet: { width: 10 },
  pointText: { flex: 1 },
  button: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xs,
  },
  buttonText: { color: colors.onMoon },
  pressed: { opacity: 0.7 },
});
