import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { player } from '@/audio/player';
import { DEFAULT_LAYER_VOLUME, MAX_MIX_LAYERS, type Program } from '@/audio/program';
import { AppText } from '@/components/AppText';
import { ChevronDownIcon } from '@/components/icons';
import { type BuildMode, ModeToggle } from '@/components/ModeToggle';
import { Screen } from '@/components/Screen';
import { VolumeSlider } from '@/components/VolumeSlider';
import { CATEGORIES, type Sound, SOUNDS } from '@/data/sounds';
import { getMix, mixToProgram, useMixes } from '@/store/mixes';
import { findSound, useRecordingSounds } from '@/store/recordings';
import { colors, fontFamily, MIN_TAP, radius, space } from '@/theme';

type Layer = { soundId: string; volume: number };

/**
 * Build a mix (up to 3 sounds at once, each with its own volume) or a
 * shuffle set (one at a time with soft crossfades). Opened with `?id=` to
 * edit a saved mix.
 */
export default function CreateScreen() {
  const params = useLocalSearchParams<{ id?: string; mode?: BuildMode }>();
  const editing = params.id ? getMix(params.id) : undefined;
  const saveMix = useMixes((s) => s.saveMix);
  const deleteMix = useMixes((s) => s.deleteMix);
  const mySounds = useRecordingSounds();

  const [mode, setMode] = useState<BuildMode>(editing ? 'mix' : (params.mode ?? 'mix'));
  const [layers, setLayers] = useState<Layer[]>(editing?.layers ?? []);
  const [shuffleIds, setShuffleIds] = useState<string[]>([]);
  const [name, setName] = useState(editing?.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(confirmTimer.current ?? undefined), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const mixFull = layers.length >= MAX_MIX_LAYERS;

  const isSelected = (id: string) =>
    mode === 'mix' ? layers.some((l) => l.soundId === id) : shuffleIds.includes(id);

  const toggle = (sound: Sound) => {
    if (mode === 'mix') {
      setLayers((current) =>
        current.some((l) => l.soundId === sound.id)
          ? current.filter((l) => l.soundId !== sound.id)
          : current.length >= MAX_MIX_LAYERS
            ? current
            : [...current, { soundId: sound.id, volume: DEFAULT_LAYER_VOLUME }],
      );
    } else {
      setShuffleIds((current) =>
        current.includes(sound.id)
          ? current.filter((id) => id !== sound.id)
          : [...current, sound.id],
      );
    }
  };

  const mixName = name.trim() || 'My mix';
  const canPlay = mode === 'mix' ? layers.length >= 1 : shuffleIds.length >= 2;

  const play = () => {
    const program: Program =
      mode === 'mix'
        ? {
            // Unsaved mixes have no id; editing a saved one keeps it, so the
            // library shows it as playing.
            ...mixToProgram({ id: editing?.id ?? '', name: mixName, layers }),
            id: editing?.id,
          }
        : {
            kind: 'shuffle',
            name: 'Your shuffle',
            sounds: shuffleIds.map(findSound).filter((s): s is Sound => s != null),
          };
    player.start(program);
    router.replace('/player');
  };

  const save = () => {
    const saved = saveMix({ id: editing?.id, name: mixName, layers });
    player.start(mixToProgram(saved));
    router.replace('/player');
  };

  const remove = () => {
    if (!editing) return;
    if (!confirmDelete) {
      // A soft confirm: tap once more within a few seconds.
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    deleteMix(editing.id);
    close();
  };

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
          {editing ? 'Edit mix' : 'Create'}
        </AppText>
        <View style={styles.close} />
      </View>

      {editing ? null : <ModeToggle value={mode} onChange={setMode} />}

      <AppText variant="caption" tone="secondary">
        {mode === 'mix'
          ? `Choose up to ${MAX_MIX_LAYERS} sounds to play together. (${layers.length}/${MAX_MIX_LAYERS})`
          : `Choose two or more sounds. Each plays for 5 minutes, then softly gives way to the next.`}
      </AppText>

      {[
        ...CATEGORIES.map(({ key, title }) => ({
          key: key as string,
          title,
          sounds: SOUNDS.filter((s) => s.category === key),
        })),
        ...(mySounds.length > 0 ? [{ key: 'mine', title: 'My Sounds', sounds: mySounds }] : []),
      ].map(({ key, title, sounds }) => (
        <View key={key} style={styles.group}>
          <AppText variant="label" tone="secondary">
            {title}
          </AppText>
          <View style={styles.chips}>
            {sounds.map((sound) => {
              const selected = isSelected(sound.id);
              const disabled = mode === 'mix' && mixFull && !selected;
              return (
                <Pressable
                  key={sound.id}
                  onPress={() => toggle(sound)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled }}
                  accessibilityLabel={sound.name}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    disabled && styles.chipDisabled,
                    pressed && styles.pressed,
                  ]}>
                  <AppText variant="label" style={selected && styles.chipSelectedText}>
                    {sound.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {mode === 'mix' && layers.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            Layer volumes
          </AppText>
          {layers.map((layer) => (
            <VolumeSlider
              key={layer.soundId}
              label={findSound(layer.soundId)?.name ?? ''}
              value={layer.volume}
              onChange={(volume) =>
                setLayers((current) =>
                  current.map((l) => (l.soundId === layer.soundId ? { ...l, volume } : l)),
                )
              }
            />
          ))}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name your mix (e.g. Nap time)"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Mix name"
            maxLength={40}
            style={styles.input}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={play}
          disabled={!canPlay}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPlay }}
          style={({ pressed }) => [
            styles.primary,
            !canPlay && styles.chipDisabled,
            pressed && styles.pressed,
          ]}>
          <AppText variant="label" style={styles.primaryText}>
            {mode === 'mix' ? 'Play' : 'Play shuffle'}
          </AppText>
        </Pressable>
        {mode === 'mix' ? (
          <Pressable
            onPress={save}
            disabled={!canPlay}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPlay }}
            style={({ pressed }) => [
              styles.secondary,
              !canPlay && styles.chipDisabled,
              pressed && styles.pressed,
            ]}>
            <AppText variant="label">{editing ? 'Save changes & play' : 'Save & play'}</AppText>
          </Pressable>
        ) : null}
        {editing ? (
          <Pressable
            onPress={remove}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <AppText variant="label" tone={confirmDelete ? 'moon' : 'secondary'}>
              {confirmDelete ? 'Tap again to delete' : 'Delete mix'}
            </AppText>
          </Pressable>
        ) : null}
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
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: MIN_TAP,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.lavender },
  chipSelectedText: { color: colors.onMoon },
  chipDisabled: { opacity: 0.4 },
  input: {
    minHeight: MIN_TAP,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: 17,
  },
  actions: { gap: space.sm, marginTop: space.sm },
  primary: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.onMoon },
  secondary: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
