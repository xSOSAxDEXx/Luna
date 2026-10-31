import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BreathingMoon } from '@/components/BreathingMoon';
import { Screen } from '@/components/Screen';
import { space } from '@/theme';

/** Sound library. The grid of sound cards arrives in build step 2. */
export default function LibraryScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <BreathingMoon size={140} />
        <AppText variant="display" accessibilityRole="header">
          Luna Beats
        </AppText>
        <AppText tone="secondary" style={styles.center}>
          One breath at a time.
        </AppText>
      </View>
      <AppText tone="muted" style={styles.center}>
        Sounds are on their way.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xl },
  center: { textAlign: 'center' },
});
