import { Pressable, StyleSheet, View } from 'react-native';

import type { Sound } from '@/data/sounds';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';
import { HeartIcon, SoundIcon } from './icons';

type Props = {
  sound: Sound;
  favorite: boolean;
  /** This sound is the one currently playing or paused. */
  active: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/** Hex colour at a given opacity (0..1), for soft category tints. */
function tint(hex: string, alpha: number) {
  return (
    hex +
    Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
  );
}

export function SoundCard({ sound, favorite, active, onPress, onToggleFavorite }: Props) {
  const categoryColor = colors.category[sound.category];
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${sound.name}${sound.placeholder ? ', placeholder sound' : ''}`}
        accessibilityHint={active ? 'Opens the player' : 'Plays with a 10 minute timer'}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: tint(categoryColor, active ? 0.26 : 0.14) },
          active && { borderColor: tint(categoryColor, 0.7) },
          pressed && styles.pressed,
        ]}>
        <SoundIcon name={sound.icon} color={categoryColor} />
        <AppText variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {sound.name}
        </AppText>
        {active ? (
          <AppText variant="caption" tone="moon">
            Playing
          </AppText>
        ) : sound.placeholder ? (
          <AppText variant="caption" tone="muted">
            Placeholder
          </AppText>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onToggleFavorite}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={
          favorite ? `Remove ${sound.name} from favorites` : `Add ${sound.name} to favorites`
        }
        accessibilityState={{ selected: favorite }}
        style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
        <HeartIcon filled={favorite} color={favorite ? colors.moon : colors.textMuted} size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '48%' },
  // Fill the row so cards side by side always match in height.
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
  name: { marginTop: 'auto' },
  heart: {
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
