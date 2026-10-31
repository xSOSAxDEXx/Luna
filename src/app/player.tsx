import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { BreathingMoon } from '@/components/BreathingMoon';
import { Screen } from '@/components/Screen';
import { colors, MIN_TAP, radius, space } from '@/theme';

/** Now-playing screen. Playback, timer ring and quick-add buttons arrive in step 2. */
export default function PlayerScreen() {
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <BreathingMoon size={180} />
      <AppText variant="title">Nothing playing yet</AppText>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close player"
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <AppText variant="label">Close</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: {
    minHeight: MIN_TAP,
    minWidth: MIN_TAP * 2,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 'auto',
  },
  pressed: { opacity: 0.7 },
});
