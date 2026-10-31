import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

export type BuildMode = 'mix' | 'shuffle';

const OPTIONS: { value: BuildMode; label: string; hint: string }[] = [
  { value: 'mix', label: 'Mix', hint: 'Up to 3 sounds at once' },
  { value: 'shuffle', label: 'Shuffle', hint: 'One at a time, softly changing' },
];

/** Two-way switch between building a mix and a shuffle set. */
export function ModeToggle({
  value,
  onChange,
}: {
  value: BuildMode;
  onChange: (mode: BuildMode) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${o.label}: ${o.hint}`}
            style={[styles.option, selected && styles.selected]}>
            <AppText variant="label" style={selected && styles.selectedText}>
              {o.label}
            </AppText>
            <AppText
              variant="caption"
              tone={selected ? undefined : 'muted'}
              style={selected && styles.selectedText}>
              {o.hint}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.skyDeep,
  },
  option: {
    flex: 1,
    minHeight: MIN_TAP + space.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  selected: { backgroundColor: colors.lavender },
  selectedText: { color: colors.onMoon, textAlign: 'center' },
});
