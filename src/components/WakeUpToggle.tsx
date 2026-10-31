import { Pressable, StyleSheet, View } from 'react-native';

import { WAKE_SOUNDS } from '@/data/sounds';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  enabled: boolean;
  soundId: string;
  /** False with "Until I stop": there's no end to wake up at. */
  hasTimer: boolean;
  onToggle: (enabled: boolean) => void;
  onPickSound: (soundId: string) => void;
};

const CHOICES = [
  { id: 'auto', name: 'Auto', placeholder: false },
  ...WAKE_SOUNDS.map(({ id, name, placeholder }) => ({ id, name, placeholder })),
];

/** "Gentle wake-up at the end" switch, with the wake-up sound choice. */
export function WakeUpToggle({ enabled, soundId, hasTimer, onToggle, onPickSound }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onToggle(!enabled)}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel="Gentle wake-up at the end"
        accessibilityHint="When the timer ends, brighter sounds rise slowly for five minutes"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.rowText}>
          <AppText variant="bodyStrong">Gentle wake-up at the end</AppText>
          <AppText variant="caption" tone="secondary">
            {!hasTimer && enabled
              ? 'Needs a timer: add time to wake up at the end'
              : 'Brighter sounds rise slowly for 5 minutes'}
          </AppText>
        </View>
        <View style={[styles.track, enabled && styles.trackOn]}>
          <View style={[styles.knob, enabled && styles.knobOn]} />
        </View>
      </Pressable>

      {enabled ? (
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel="Wake-up sound">
          {CHOICES.map((c) => {
            const selected = c.id === soundId;
            return (
              <Pressable
                key={c.id}
                onPress={() => onPickSound(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={c.placeholder ? `${c.name} (placeholder)` : c.name}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.pressed,
                ]}>
                <AppText variant="label" style={selected && styles.chipSelectedText}>
                  {c.name}
                </AppText>
                {c.placeholder ? (
                  <AppText
                    variant="caption"
                    tone={selected ? undefined : 'muted'}
                    style={selected && styles.chipSelectedText}>
                    Placeholder
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const TRACK_W = 52;
const TRACK_H = 30;
const KNOB = 24;

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  rowText: { flex: 1, gap: 2 },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    paddingHorizontal: (TRACK_H - KNOB) / 2,
  },
  trackOn: { backgroundColor: colors.lavenderSoft },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.textSecondary,
  },
  knobOn: { alignSelf: 'flex-end', backgroundColor: colors.moon },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: MIN_TAP,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.lavender },
  chipSelectedText: { color: colors.onMoon },
  pressed: { opacity: 0.7 },
});
