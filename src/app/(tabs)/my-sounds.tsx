import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { player, usePlayer } from '@/audio/player';
import { single } from '@/audio/program';
import { AppText } from '@/components/AppText';
import { MicIcon } from '@/components/icons';
import { Notice } from '@/components/Notice';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { Screen } from '@/components/Screen';
import { SoundCard } from '@/components/SoundCard';
import type { Sound } from '@/data/sounds';
import { formatDuration } from '@/recording/options';
import { getRecording, useRecordings, useRecordingSounds } from '@/store/recordings';
import { useSettings } from '@/store/settings';
import { colors, MIN_TAP, radius, space } from '@/theme';

/**
 * The parent's own recordings (lullabies and stories). Each one plays like
 * any built-in sound: one tap, with the timer, and in mixes and shuffles.
 */
export default function MySoundsScreen() {
  const sounds = useRecordingSounds();
  const recordings = useRecordings((s) => s.recordings);
  const filesLoaded = useRecordings((s) => s.filesVersion > 0);
  const favorites = useSettings((s) => s.favorites);
  const toggleFavorite = useSettings((s) => s.toggleFavorite);
  const { program, status } = usePlayer();
  const live = status === 'playing' || status === 'paused';
  // Saved, but the audio isn't on this device (e.g. the browser cleared it).
  const missing = filesLoaded ? recordings.filter((r) => !sounds.some((s) => s.id === r.id)) : [];

  const isActive = (sound: Sound) =>
    live && program?.kind === 'single' && program.sound.id === sound.id;
  const play = (sound: Sound) => {
    if (!isActive(sound)) player.start(single(sound));
    router.push('/player');
  };
  const shuffleAll = () => {
    player.start({ kind: 'shuffle', name: 'My Sounds shuffle', sounds });
    router.push('/player');
  };
  const edit = (id: string) => router.push({ pathname: '/record', params: { id } });

  return (
    <Screen footer={<NowPlayingBar />}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          My Sounds
        </AppText>
        <AppText tone="secondary">Lullabies and stories, in your own voice.</AppText>
      </View>

      <Pressable
        onPress={() => router.push('/record')}
        accessibilityRole="button"
        accessibilityLabel="Record"
        accessibilityHint="Record a lullaby or a story"
        style={({ pressed }) => [styles.record, pressed && styles.pressed]}>
        <MicIcon color={colors.onMoon} size={28} />
        <AppText variant="bodyStrong" style={styles.recordText}>
          Record
        </AppText>
      </Pressable>

      {Platform.OS === 'web' ? (
        <Notice
          title="Kept in this browser"
          body="On the website, recordings are stored by your browser, which can clear them (Safari may after a few weeks away). Make a backup in Settings, or use the app for anything precious."
        />
      ) : null}

      {sounds.length === 0 && missing.length === 0 ? (
        <AppText tone="muted" style={styles.empty}>
          Nothing here yet. Record a lullaby you love to sing, or a favorite bedtime story.
        </AppText>
      ) : null}

      {sounds.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="label" tone="secondary" accessibilityRole="header">
              Your recordings
            </AppText>
            {sounds.length >= 2 ? (
              <Pressable
                onPress={shuffleAll}
                accessibilityRole="button"
                accessibilityLabel="Shuffle my sounds"
                style={({ pressed }) => [styles.shuffle, pressed && styles.pressed]}>
                <AppText variant="caption" tone="lavender">
                  Shuffle
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.grid}>
            {sounds.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                favorite={favorites.includes(sound.id)}
                active={isActive(sound)}
                detail={formatDuration(getRecording(sound.id)?.durationMs ?? 0)}
                onPress={() => play(sound)}
                onToggleFavorite={() => toggleFavorite(sound.id)}
                onEdit={() => edit(sound.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {missing.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            Waiting for their sound
          </AppText>
          {missing.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => edit(r.id)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, sound missing. Edit or delete`}
              style={({ pressed }) => [styles.missing, pressed && styles.pressed]}>
              <AppText variant="bodyStrong">{r.name}</AppText>
              <AppText variant="caption" tone="muted">
                Its audio isn&apos;t on this device. Restore a backup in Settings, or delete it.
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs },
  record: {
    minHeight: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.moon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  recordText: { color: colors.onMoon },
  empty: { textAlign: 'center', paddingVertical: space.lg },
  section: { gap: space.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shuffle: {
    minHeight: MIN_TAP,
    minWidth: MIN_TAP,
    paddingHorizontal: space.md,
    marginRight: -space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
  missing: {
    minHeight: MIN_TAP,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  pressed: { opacity: 0.7 },
});
