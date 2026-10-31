import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { player, usePlayer } from '@/audio/player';
import { formatRemaining, progress } from '@/audio/timer';
import { AppText } from '@/components/AppText';
import { ChevronDownIcon, PauseIcon, PlayIcon, StopIcon } from '@/components/icons';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { Screen } from '@/components/Screen';
import { TimerRing } from '@/components/TimerRing';
import { VolumeSlider } from '@/components/VolumeSlider';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/store/settings';
import { colors, MIN_TAP, space } from '@/theme';
import { audioFade } from '@/theme/motion';

/** Now playing: the timer ring, quick-add buttons and controls. */
export default function PlayerScreen() {
  const { status, sound, timer } = usePlayer();
  const volume = useSettings((s) => s.volume);
  const setVolume = useSettings((s) => s.setVolume);
  const now = useNow(1000, status === 'playing');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!sound || !timer || status === 'idle') {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <CloseButton onPress={close} />
        <View style={styles.empty}>
          <AppText variant="title">Nothing playing</AppText>
          <AppText tone="secondary">Pick a sound from the library to begin.</AppText>
        </View>
      </Screen>
    );
  }

  const finished = status === 'finished';
  const playing = status === 'playing';
  const fading =
    playing &&
    timer.kind === 'countdown' &&
    timer.endsAt - now <= audioFade.timerEndMs &&
    timer.endsAt - now > 0;
  const label = finished ? 'Sleep well' : formatRemaining(timer, now);

  const onMainButton = () => {
    if (finished) player.start(sound);
    else if (playing) player.pause();
    else player.resume();
  };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <CloseButton onPress={close} />
        <View style={styles.titleWrap}>
          <AppText variant="title" numberOfLines={1} accessibilityRole="header">
            {sound.name}
          </AppText>
        </View>
        <View style={styles.spacer} />
      </View>

      <View style={styles.ringWrap}>
        <TimerRing progress={finished ? 0 : progress(timer, now)}>
          <AppText
            // Big digits for "12 min"; calmer, smaller words for everything else.
            variant={/^\d/.test(label) ? 'timer' : 'title'}
            style={styles.ringText}
            accessibilityLiveRegion="polite">
            {label}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {finished
              ? 'The sound has faded out'
              : fading
                ? 'Drifting off…'
                : status === 'paused'
                  ? 'Paused'
                  : timer.kind === 'untilStop'
                    ? 'No timer'
                    : 'left'}
          </AppText>
        </TimerRing>
      </View>

      {/* Controls sit low on the screen, within thumb reach. */}
      <View style={styles.controls}>
        <QuickAddButtons
          onAdd={(m) => player.addMinutes(m)}
          onUntilStop={() => player.playUntilStopped()}
          untilStopActive={timer.kind === 'untilStop' && !finished}
        />
        <VolumeSlider value={volume} onChange={setVolume} />
        <View style={styles.transport}>
          <Pressable
            onPress={() => {
              player.stop();
              close();
            }}
            disabled={finished}
            accessibilityRole="button"
            accessibilityLabel="Stop"
            accessibilityState={{ disabled: finished }}
            style={({ pressed }) => [
              styles.secondaryButton,
              finished && styles.hidden,
              pressed && styles.pressed,
            ]}>
            <StopIcon color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onMainButton}
            accessibilityRole="button"
            accessibilityLabel={finished ? 'Play again' : playing ? 'Pause' : 'Play'}
            style={({ pressed }) => [styles.mainButton, pressed && styles.pressed]}>
            {playing ? (
              <PauseIcon color={colors.onMoon} size={36} />
            ) : (
              <PlayIcon color={colors.onMoon} size={36} />
            )}
          </Pressable>
          {/* Balances the Stop button so Play stays centred. */}
          <View style={styles.balance} />
        </View>
      </View>
    </Screen>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close player"
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
      <ChevronDownIcon color={colors.textSecondary} />
    </Pressable>
  );
}

const MAIN = 88;

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  spacer: { width: MIN_TAP },
  close: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.md,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm },
  ringWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  ringText: { textAlign: 'center', paddingHorizontal: space.lg },
  controls: { gap: space.lg },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  mainButton: {
    width: MAIN,
    height: MAIN,
    borderRadius: MAIN / 2,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: MIN_TAP + space.sm,
    height: MIN_TAP + space.sm,
    borderRadius: (MIN_TAP + space.sm) / 2,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { width: MIN_TAP + space.sm },
  hidden: { opacity: 0 },
  pressed: { opacity: 0.7 },
});
