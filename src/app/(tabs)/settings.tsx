import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { player } from '@/audio/player';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { getSound } from '@/data/sounds';
import {
  clearLog,
  DIAGNOSTICS_ENABLED,
  formatEntry,
  formatLog,
  useDiagnosticsLog,
} from '@/diagnostics/log';
import { colors, MIN_TAP, radius, space } from '@/theme';

/** Settings (reminders, volume cap, backup and restore). Built in steps 6–7. */
export default function SettingsScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Settings
      </AppText>
      <AppText tone="secondary">Nothing to adjust yet.</AppText>
      {DIAGNOSTICS_ENABLED ? <PlaybackCheck /> : null}
    </Screen>
  );
}

/**
 * Test builds only: the playback log, so a tester can share what happened
 * overnight (background ticks, interruptions, how late the timer stopped).
 */
function PlaybackCheck() {
  const entries = useDiagnosticsLog();
  const recent = entries.slice(-60).reverse();

  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        Playback check (test build)
      </AppText>
      <AppText variant="caption" tone="muted">
        A record of what the player did, kept only on this phone. Share it after a test run.
      </AppText>
      <Button
        label="Start 2-minute test (brown noise)"
        onPress={() => {
          const sound = getSound('brown-noise');
          if (!sound) return;
          player.start(sound, 2);
          router.push('/player');
        }}
      />
      <View style={styles.buttons}>
        <Button
          label="Share log"
          grow
          onPress={() => Share.share({ message: formatLog() || 'No events yet.' })}
        />
        <Button label="Clear" grow onPress={clearLog} />
      </View>
      <View style={styles.log}>
        {recent.length === 0 ? (
          <AppText variant="caption" tone="muted">
            No events yet. Play a sound to start.
          </AppText>
        ) : (
          recent.map((entry, i) => (
            <AppText key={`${entry.t}-${i}`} variant="caption" tone="secondary" selectable>
              {formatEntry(entry)}
            </AppText>
          ))
        )}
      </View>
    </View>
  );
}

function Button({ label, onPress, grow }: { label: string; onPress: () => void; grow?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, grow && styles.grow, pressed && styles.pressed]}>
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.lg },
  buttons: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
  button: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  log: {
    backgroundColor: colors.skyDeep,
    borderRadius: radius.sm,
    padding: space.md,
    gap: space.xs,
  },
  pressed: { opacity: 0.7 },
});
