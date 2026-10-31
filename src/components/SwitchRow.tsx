import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TAP, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  label: string;
  /** A short line under the label. */
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityHint?: string;
};

/** A whole-row switch: big to tap, with a soft track and knob. */
export function SwitchRow({ label, detail, value, onChange, accessibilityHint }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {detail ? (
          <AppText variant="caption" tone="secondary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const TRACK_W = 52;
const TRACK_H = 30;
const KNOB = 24;

const styles = StyleSheet.create({
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
  pressed: { opacity: 0.7 },
});
