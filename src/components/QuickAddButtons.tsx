import { Pressable, StyleSheet, View } from 'react-native';

import { QUICK_ADD_MINUTES } from '@/audio/timer';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  onAdd: (minutes: number) => void;
  onUntilStop: () => void;
  untilStopActive: boolean;
};

export function QuickAddButtons({ onAdd, onUntilStop, untilStopActive }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {QUICK_ADD_MINUTES.map((m) => (
          <Pressable
            key={m}
            onPress={() => onAdd(m)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${m} minutes`}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <AppText variant="label">+{m} min</AppText>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={onUntilStop}
        accessibilityRole="button"
        accessibilityLabel="Play until I stop"
        accessibilityHint="Turns off the timer"
        accessibilityState={{ selected: untilStopActive }}
        style={({ pressed }) => [
          styles.button,
          styles.untilStop,
          untilStopActive && styles.selected,
          pressed && styles.pressed,
        ]}>
        <AppText variant="label" style={untilStopActive && { color: colors.onMoon }}>
          Until I stop
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: space.sm },
  button: {
    flex: 1,
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  untilStop: { flex: 0, alignSelf: 'stretch' },
  selected: { backgroundColor: colors.moon },
  pressed: { opacity: 0.7 },
});
