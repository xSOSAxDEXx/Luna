import { Pressable, StyleSheet, View } from 'react-native';

import { getSound } from '@/data/sounds';
import type { SavedMix } from '@/store/mixes';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';
import { SlidersIcon, SoundIcon } from './icons';

const tint = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');

type Props = {
  mix: SavedMix;
  active: boolean;
  onPress: () => void;
  onEdit: () => void;
};

/** A saved mix in the library: one tap plays it, the corner button edits it. */
export function MixCard({ mix, active, onPress, onEdit }: Props) {
  const names = mix.layers.map((l) => getSound(l.soundId)?.name).filter(Boolean);
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${mix.name}, mix of ${names.join(', ')}`}
        accessibilityHint={active ? 'Opens the player' : 'Plays with a 10 minute timer'}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: tint(colors.lavender, active ? 0.26 : 0.14) },
          active && { borderColor: tint(colors.lavender, 0.7) },
          pressed && styles.pressed,
        ]}>
        <SoundIcon name="note" color={colors.lavender} />
        <AppText variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {mix.name}
        </AppText>
        <AppText variant="caption" tone={active ? 'moon' : 'muted'} numberOfLines={2}>
          {active ? 'Playing' : names.join(' + ')}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${mix.name}`}
        style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
        <SlidersIcon color={colors.textMuted} size={22} />
      </Pressable>
    </View>
  );
}

/** The "make a new mix or shuffle" card. */
export function CreateCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Create a mix or shuffle"
        style={({ pressed }) => [styles.card, styles.create, pressed && styles.pressed]}>
        <AppText variant="title" tone="lavender">
          +
        </AppText>
        <AppText variant="bodyStrong" style={styles.name}>
          Create
        </AppText>
        <AppText variant="caption" tone="muted">
          Mix or shuffle sounds
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '48%' },
  card: {
    flexGrow: 1,
    minHeight: 132,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: space.md,
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  create: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  name: { marginTop: 'auto' },
  edit: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
