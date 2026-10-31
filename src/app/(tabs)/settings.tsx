import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { player } from '@/audio/player';
import { exportBackup, importBackup, type BackupOutcome } from '@/backup/backup';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Notice';
import { SafeSleepReminder } from '@/components/SafeSleepReminder';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/SwitchRow';
import { getSound } from '@/data/sounds';
import {
  clearLog,
  DIAGNOSTICS_ENABLED,
  formatEntry,
  formatLog,
  useDiagnosticsLog,
} from '@/diagnostics/log';
import { type QuietReminder, SOFT_VOLUME_CAP, useSettings } from '@/store/settings';
import { colors, MIN_TAP, radius, space } from '@/theme';

/** Settings: safe-sleep guidance, volume, the quiet-phone reminder, backup and restore. */
export default function SettingsScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Settings
      </AppText>
      <SafeSleepReminder />
      <VolumeSafety />
      <QuietPhoneSetting />
      <BackupRestore />
      {DIAGNOSTICS_ENABLED ? <PlaybackCheck /> : null}
    </Screen>
  );
}

/** The kind volume tip (CLAUDE.md §3.8) and the soft volume cap, on by default. */
function VolumeSafety() {
  const softVolumeCap = useSettings((s) => s.softVolumeCap);
  const setSoftVolumeCap = useSettings((s) => s.setSoftVolumeCap);
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        Volume
      </AppText>
      <AppText variant="caption" tone="secondary">
        Little ears are sensitive. Sound carries well, so a phone across the room from the crib at a
        soft volume is plenty.
      </AppText>
      <SwitchRow
        label="Soft volume cap"
        detail={`Keeps the sound at ${Math.round(SOFT_VOLUME_CAP * 100)}% or below`}
        value={softVolumeCap}
        onChange={setSoftVolumeCap}
      />
    </View>
  );
}

const QUIET_CHOICES: { value: QuietReminder; label: string }[] = [
  { value: 'always', label: 'Every time' },
  { value: 'daily', label: 'Once a day' },
  { value: 'never', label: 'Never' },
];

/** How often "Before you settle in… silence your phone" shows (CLAUDE.md §3.7). */
function QuietPhoneSetting() {
  const quietReminder = useSettings((s) => s.quietReminder);
  const setQuietReminder = useSettings((s) => s.setQuietReminder);
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        “Quiet your phone” reminder
      </AppText>
      <AppText variant="caption" tone="secondary">
        When a sound starts, a gentle card suggests silencing your phone and turning off vibration.
      </AppText>
      <View
        style={styles.choices}
        accessibilityRole="radiogroup"
        accessibilityLabel="Show the quiet-your-phone reminder">
        {QUIET_CHOICES.map(({ value, label }) => {
          const selected = quietReminder === value;
          return (
            <Pressable
              key={value}
              onPress={() => setQuietReminder(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && styles.pressed,
              ]}>
              <AppText variant="label" style={selected && styles.choiceSelectedText}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Backup and restore: one file with settings, favorites, mixes and
 * recordings. It's made on this device and goes only where the parent puts it.
 */
function BackupRestore() {
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [outcome, setOutcome] = useState<BackupOutcome>(null);

  const run = async (kind: 'export' | 'import') => {
    setBusy(kind);
    setOutcome(null);
    try {
      setOutcome(await (kind === 'export' ? exportBackup() : importBackup()));
    } catch (error) {
      console.warn('Backup or restore failed', error);
      setOutcome({
        ok: false,
        message:
          kind === 'export'
            ? "The backup couldn't be made. Please try again."
            : "That file couldn't be read. Please try again, or choose another backup.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        Backup and restore
      </AppText>
      <AppText variant="caption" tone="secondary">
        Save one file with your settings, favorites, mixes and recordings.
        {Platform.OS === 'web'
          ? ' It downloads to this device.'
          : ' Choose where it goes: Files, your cloud drive or email.'}{' '}
        Restoring adds to what&apos;s here and never deletes anything.
      </AppText>
      <View style={styles.buttons}>
        <Button
          label={busy === 'export' ? 'Making backup…' : 'Make a backup'}
          grow
          disabled={busy != null}
          onPress={() => run('export')}
        />
        <Button
          label={busy === 'import' ? 'Restoring…' : 'Restore'}
          grow
          disabled={busy != null}
          onPress={() => run('import')}
          accessibilityHint="Choose a Luna Beats backup file"
        />
      </View>
      {outcome ? (
        <Notice
          title={outcome.ok ? 'All done' : 'That didn’t work'}
          body={outcome.message}
          onDismiss={() => setOutcome(null)}
        />
      ) : null}
    </View>
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

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.lg },
  buttons: { flexDirection: 'row', gap: space.sm },
  log: {
    backgroundColor: colors.skyDeep,
    borderRadius: radius.sm,
    padding: space.md,
    gap: space.xs,
  },
  choices: { flexDirection: 'row', gap: space.sm },
  choice: {
    flex: 1,
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  choiceSelected: { backgroundColor: colors.lavender },
  choiceSelectedText: { color: colors.onMoon },
  pressed: { opacity: 0.7 },
});
