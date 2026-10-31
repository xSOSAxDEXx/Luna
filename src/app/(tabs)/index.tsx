import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { player, usePlayer } from '@/audio/player';
import { AppText } from '@/components/AppText';
import { BreathingMoon } from '@/components/BreathingMoon';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { Screen } from '@/components/Screen';
import { SoundCard } from '@/components/SoundCard';
import { CATEGORIES, getSound, type Sound, SOUNDS } from '@/data/sounds';
import { useSettings } from '@/store/settings';
import { space } from '@/theme';

/** The sound library: favorites first, then each category. One tap plays. */
export default function LibraryScreen() {
  const favorites = useSettings((s) => s.favorites);
  const toggleFavorite = useSettings((s) => s.toggleFavorite);
  const { sound: current, status } = usePlayer();

  const isActive = (sound: Sound) =>
    current?.id === sound.id && (status === 'playing' || status === 'paused');

  const play = (sound: Sound) => {
    if (!isActive(sound)) player.start(sound);
    router.push('/player');
  };

  const favoriteSounds = favorites.map((id) => getSound(id)).filter((s): s is Sound => s != null);

  const sections = [
    ...(favoriteSounds.length > 0
      ? [{ key: 'favorites', title: 'Favorites', sounds: favoriteSounds }]
      : []),
    ...CATEGORIES.map(({ key, title }) => ({
      key,
      title,
      sounds: SOUNDS.filter((s) => s.category === key),
    })),
  ];

  return (
    <Screen footer={<NowPlayingBar />}>
      <View style={styles.header}>
        <BreathingMoon size={64} />
        <View style={styles.headerText}>
          <AppText variant="title" accessibilityRole="header">
            Luna Beats
          </AppText>
          <AppText variant="caption" tone="secondary">
            One breath at a time.
          </AppText>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            {section.title}
          </AppText>
          <View style={styles.grid}>
            {section.sounds.map((sound) => (
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
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1 },
  section: { gap: space.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
});
