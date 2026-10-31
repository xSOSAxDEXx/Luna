import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { player, usePlayer } from '@/audio/player';
import { single } from '@/audio/program';
import { AppText } from '@/components/AppText';
import { BreathingMoon } from '@/components/BreathingMoon';
import { CreateCard, MixCard } from '@/components/MixCard';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { Screen } from '@/components/Screen';
import { SoundCard } from '@/components/SoundCard';
import { AFFIRMATIONS, nextAffirmation } from '@/data/affirmations';
import { CATEGORIES, type Sound, SOUNDS } from '@/data/sounds';
import { mixToProgram, type SavedMix, useMixes } from '@/store/mixes';
import { findSound, useRecordings, useRecordingSounds } from '@/store/recordings';
import { useSettings } from '@/store/settings';
import { MIN_TAP, radius, space } from '@/theme';

/**
 * The sound library: favorites first, then saved mixes, then each category
 * (each with a Shuffle button). One tap plays.
 */
/** Which affirmation showed last, so the next visit shows a different one. */
let lastAffirmation = 0;

export default function LibraryScreen() {
  const [affirmation, setAffirmation] = useState(lastAffirmation);
  useFocusEffect(
    useCallback(
      () => () => {
        // On leaving, pick the next one, so it's ready (no flicker) when they come back.
        lastAffirmation = nextAffirmation(lastAffirmation);
        setAffirmation(lastAffirmation);
      },
      [],
    ),
  );
  const favorites = useSettings((s) => s.favorites);
  const toggleFavorite = useSettings((s) => s.toggleFavorite);
  const mixes = useMixes((s) => s.mixes);
  const mySounds = useRecordingSounds();
  // Favorites can include recordings, so re-read them when files load.
  const filesVersion = useRecordings((s) => s.filesVersion);
  const { program, status } = usePlayer();
  const live = status === 'playing' || status === 'paused';

  const isActive = (sound: Sound) =>
    live && program?.kind === 'single' && program.sound.id === sound.id;
  const isMixActive = (mix: SavedMix) => live && program?.kind === 'mix' && program.id === mix.id;

  const play = (sound: Sound) => {
    if (!isActive(sound)) player.start(single(sound));
    router.push('/player');
  };
  const playMix = (mix: SavedMix) => {
    if (!isMixActive(mix)) player.start(mixToProgram(mix));
    router.push('/player');
  };
  const shuffleCategory = (title: string, sounds: Sound[]) => {
    player.start({ kind: 'shuffle', name: `${title} shuffle`, sounds });
    router.push('/player');
  };
  const create = () => router.push('/create');

  const favoriteSounds = favoriteList(favorites, filesVersion);

  const mixesSection = (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        Your mixes
      </AppText>
      <View style={styles.grid}>
        {mixes.map((mix) => (
          <MixCard
            key={mix.id}
            mix={mix}
            active={isMixActive(mix)}
            onPress={() => playMix(mix)}
            onEdit={() => router.push({ pathname: '/create', params: { id: mix.id } })}
          />
        ))}
        <CreateCard onPress={create} />
      </View>
    </View>
  );

  return (
    <Screen footer={<NowPlayingBar />}>
      <View style={styles.header}>
        <BreathingMoon size={64} />
        <View style={styles.headerText}>
          <AppText variant="title" accessibilityRole="header">
            Luna Beats
          </AppText>
          <AppText variant="caption" tone="secondary">
            {AFFIRMATIONS[affirmation]}
          </AppText>
        </View>
      </View>

      {favoriteSounds.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            Favorites
          </AppText>
          <View style={styles.grid}>
            {favoriteSounds.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                favorite
                active={isActive(sound)}
                onPress={() => play(sound)}
                onToggleFavorite={() => toggleFavorite(sound.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Saved mixes sit near the top; with none yet, "Create" waits at the end. */}
      {mixes.length > 0 ? mixesSection : null}

      {[
        ...CATEGORIES.map(({ key, title }) => ({
          key: key as string,
          title,
          sounds: SOUNDS.filter((s) => s.category === key),
        })),
        // The parent's own recordings, once there are some.
        ...(mySounds.length > 0 ? [{ key: 'mine', title: 'My Sounds', sounds: mySounds }] : []),
      ].map(({ key, title, sounds }) => {
        return (
          <View key={key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="label" tone="secondary" accessibilityRole="header">
                {title}
              </AppText>
              {sounds.length >= 2 ? (
                <Pressable
                  onPress={() => shuffleCategory(title, sounds)}
                  accessibilityRole="button"
                  accessibilityLabel={`Shuffle ${title} sounds`}
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
                  onPress={() => play(sound)}
                  onToggleFavorite={() => toggleFavorite(sound.id)}
                />
              ))}
            </View>
          </View>
        );
      })}

      {mixes.length === 0 ? mixesSection : null}
    </Screen>
  );
}

/** `filesVersion` is passed so this re-runs when recordings finish loading. */
function favoriteList(favorites: string[], _filesVersion: number): Sound[] {
  return favorites.map(findSound).filter((s): s is Sound => s != null);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1 },
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
  pressed: { opacity: 0.7 },
});
