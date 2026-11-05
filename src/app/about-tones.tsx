import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronDownIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { ABOUT_TONES } from '@/data/aboutTones';
import { SOUNDS } from '@/data/sounds';
import { colors, MIN_TAP, radius, space } from '@/theme';

/** "About these tones": a warm, honest note on Harmony Tones (text in src/data/aboutTones.ts). */
export default function AboutTonesScreen() {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const tones = SOUNDS.filter((s) => s.category === 'harmony');
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <ChevronDownIcon color={colors.textSecondary} />
        </Pressable>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {ABOUT_TONES.title}
        </AppText>
        <View style={styles.close} />
      </View>
      {ABOUT_TONES.paragraphs.map((p) => (
        <AppText key={p} tone="secondary">
          {p}
        </AppText>
      ))}
      <View style={styles.list}>
        {tones.map((tone) => (
          <View key={tone.id} style={styles.row}>
            <AppText variant="bodyStrong">
              {tone.name}{' '}
              <AppText variant="caption" tone="muted">
                {tone.frequencyLabel}
              </AppText>
            </AppText>
            <AppText variant="caption" tone="secondary">
              {tone.description}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  close: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.md,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
  },
  row: { gap: 2 },
  pressed: { opacity: 0.7 },
});
