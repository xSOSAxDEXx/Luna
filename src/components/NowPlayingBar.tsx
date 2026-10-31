import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { player, usePlayer } from '@/audio/player';
import { formatRemaining } from '@/audio/timer';
import { useNow } from '@/hooks/useNow';
import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';
import { CloseIcon, PauseIcon, PlayIcon } from './icons';

/** A slim "now playing" bar on the library, so the player is one tap away. */
export function NowPlayingBar() {
  const { status, sound, program, title, timer } = usePlayer();
  const now = useNow(1000, status === 'playing');
  if (!sound || !program || !timer || status === 'idle') return null;

  const playing = status === 'playing';
  const detail = status === 'finished' ? 'Sleep well' : formatRemaining(timer, now);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => router.push('/player')}
        accessibilityRole="button"
        accessibilityLabel={`Now playing ${title}, ${detail}`}
        accessibilityHint="Opens the player"
        style={({ pressed }) => [styles.info, pressed && styles.pressed]}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {detail}
        </AppText>
      </Pressable>
      {status === 'finished' ? (
        <>
          <Pressable
            onPress={() => player.start(program)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${title} again`}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <PlayIcon color={colors.onMoon} size={26} />
          </Pressable>
          <Pressable
            onPress={() => player.stop()}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
            <CloseIcon color={colors.textMuted} size={22} />
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => (playing ? player.pause() : player.resume())}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          {playing ? (
            <PauseIcon color={colors.onMoon} size={26} />
          ) : (
            <PlayIcon color={colors.onMoon} size={26} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    paddingLeft: space.md,
  },
  info: { flex: 1, minHeight: MIN_TAP, justifyContent: 'center' },
  button: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismiss: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
