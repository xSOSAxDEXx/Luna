import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { setRecordingAudioMode } from '@/audio/expoOutput';
import { player } from '@/audio/player';
import { programSounds } from '@/audio/program';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import {
  ChevronDownIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SoundIcon,
  StopIcon,
} from '@/components/icons';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/SwitchRow';
import { logEvent } from '@/diagnostics/log';
import { keepRecording, RECORDINGS_MAY_BE_CLEARED, recordingSource } from '@/recording/files';
import { formatDuration, MAX_RECORDING_MS, RECORDING_OPTIONS } from '@/recording/options';
import { findTrim, type LevelSample, type TrimRange } from '@/recording/trim';
import {
  getRecording,
  MAX_RECORDING_NAME,
  newRecordingId,
  RECORDING_COLORS,
  RECORDING_ICONS,
  type Recording,
  type RecordingColor,
  useRecordings,
} from '@/store/recordings';
import { useSettings } from '@/store/settings';
import { colors, fontFamily, MIN_TAP, radius, space } from '@/theme';

type Details = {
  name: string;
  icon: Recording['icon'];
  color: RecordingColor;
  trimSilence: boolean;
};

const close = () => (router.canGoBack() ? router.back() : router.replace('/my-sounds'));

/**
 * Whether we can still ask. Browsers report "can ask again" even after a
 * no, but won't show the prompt again, so a denied microphone on the web
 * means the parent has to allow it in the browser's settings.
 */
const canAsk = (p: { canAskAgain: boolean; status: string }) =>
  p.canAskAgain && !(Platform.OS === 'web' && p.status === 'denied');

/**
 * Record a lullaby or story (CLAUDE.md §3.6): record → listen back →
 * re-record or save → name it and pick an icon and color. Opened with
 * `?id=` to rename, restyle or delete a saved recording.
 */
export default function RecordScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = id ? getRecording(id) : undefined;
  return editing ? <EditRecording recording={editing} /> : <NewRecording />;
}

type Stage = 'checking' | 'ask' | 'blocked' | 'ready' | 'recording' | 'review' | 'saving';
type Take = { uri: string; durationMs: number; trim: TrimRange | null };

function NewRecording() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const addRecording = useRecordings((s) => s.addRecording);
  const [stage, setStage] = useState<Stage>('checking');
  const [take, setTake] = useState<Take | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>({
    name: '',
    icon: 'note',
    color: 'gold',
    trimSilence: true,
  });
  const levels = useRef<LevelSample[]>([]);
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  const stopping = useRef(false);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only ask for the microphone once the parent has read why (the "ask" stage).
  useEffect(() => {
    getRecordingPermissionsAsync()
      .then((p) => setStage(p.granted ? 'ready' : canAsk(p) ? 'ask' : 'blocked'))
      .catch(() => setStage('ask'));
  }, []);

  // Collect loudness levels while recording, for the silence trim.
  const { isRecording, durationMillis, metering } = recorderState;
  useEffect(() => {
    if (stage === 'recording' && isRecording && metering != null) {
      levels.current.push({ atMs: durationMillis, db: metering });
    }
  }, [stage, isRecording, durationMillis, metering]);

  // Leaving mid-take: stop the microphone and put the audio session back.
  useEffect(
    () => () => {
      clearTimeout(limitTimer.current ?? undefined);
      if (stageRef.current === 'recording') {
        void recorder.stop().catch(() => {});
        void setRecordingAudioMode(false);
      }
    },
    [recorder],
  );

  const allow = async () => {
    const p = await requestRecordingPermissionsAsync().catch(() => null);
    if (p?.granted) {
      setStage('ready');
      logEvent('mic-permission', { granted: true });
    } else {
      setStage(p && !canAsk(p) ? 'blocked' : 'ask');
      logEvent('mic-permission', { granted: false });
    }
  };

  const start = async () => {
    setMessage(null);
    // The sleep sound would end up in the recording, so it stops first.
    player.stop();
    levels.current = [];
    try {
      await setRecordingAudioMode(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStage('recording');
      // A take stops by itself at the limit.
      limitTimer.current = setTimeout(() => void stop(), MAX_RECORDING_MS);
    } catch (error) {
      console.warn('Could not start recording', error);
      await setRecordingAudioMode(false);
      setMessage("The microphone didn't start. Please try again in a moment.");
      setStage('ready');
    }
  };

  const stop = async () => {
    if (stopping.current) return;
    stopping.current = true;
    clearTimeout(limitTimer.current ?? undefined);
    const durationMs = Math.max(durationMillis, (recorder.currentTime ?? 0) * 1000);
    try {
      await recorder.stop();
    } catch (error) {
      console.warn('Could not stop recording', error);
    }
    await setRecordingAudioMode(false);
    stopping.current = false;
    const uri = recorder.uri;
    if (!uri || durationMs < 1000) {
      setMessage(
        uri
          ? 'That was a little short. Tap Record and try again.'
          : "That take didn't save. Please try again.",
      );
      setStage('ready');
      return;
    }
    setTake({ uri, durationMs, trim: findTrim(levels.current, durationMs) });
    setStage('review');
  };

  const save = async () => {
    if (!take) return;
    setStage('saving');
    const id = newRecordingId();
    try {
      const fileName = await keepRecording(take.uri, id);
      addRecording({
        id,
        name: details.name,
        icon: details.icon,
        color: details.color,
        fileName,
        durationMs: take.durationMs,
        trim: take.trim,
        trimSilence: details.trimSilence,
        createdAt: Date.now(),
      });
      logEvent('recording-saved', {
        seconds: Math.round(take.durationMs / 1000),
        trimmedSeconds: take.trim
          ? Math.round((take.durationMs - (take.trim.endMs - take.trim.startMs)) / 1000)
          : 0,
      });
      close();
    } catch (error) {
      console.warn('Could not save recording', error);
      setMessage("Your recording couldn't be saved. Please try again.");
      setStage('review');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={stage === 'review' || stage === 'saving' ? 'Listen back' : 'Record'} />

      {stage === 'ask' ? (
        <View style={styles.block}>
          <AppText variant="bodyStrong">May Luna Beats use your microphone?</AppText>
          <AppText tone="secondary">
            So you can sing a lullaby or read a story in your own voice. Your little one knows it
            best. We only listen while you record, and your recordings stay on this device.
          </AppText>
          <Button label="Allow microphone" variant="primary" onPress={allow} />
          <Button label="Not now" onPress={close} />
        </View>
      ) : null}

      {stage === 'blocked' ? (
        <View style={styles.block}>
          <AppText variant="bodyStrong">The microphone is switched off for Luna Beats</AppText>
          <AppText tone="secondary">
            {Platform.OS === 'web'
              ? "That's fine. If you'd like to record, allow the microphone for this site in your browser's settings, then come back."
              : "That's fine. If you'd like to record, you can switch it on in your phone's settings, under Luna Beats."}
          </AppText>
          {Platform.OS !== 'web' ? (
            <Button
              label="Open settings"
              variant="primary"
              onPress={() => Linking.openSettings()}
            />
          ) : null}
          <Button label="Not now" onPress={close} />
        </View>
      ) : null}

      {stage === 'ready' || stage === 'recording' ? (
        <View style={styles.recordArea}>
          <AppText tone="secondary" style={styles.center}>
            {stage === 'recording'
              ? 'Take your time. Tap stop when you’re done.'
              : 'Sing a lullaby or read a story. Tap the microphone when you’re ready.'}
          </AppText>
          <Pressable
            onPress={stage === 'recording' ? stop : start}
            accessibilityRole="button"
            accessibilityLabel={stage === 'recording' ? 'Stop recording' : 'Start recording'}
            style={({ pressed }) => [
              styles.recordButton,
              stage === 'recording' && styles.recordButtonOn,
              pressed && styles.pressed,
            ]}>
            {stage === 'recording' ? (
              <StopIcon color={colors.onMoon} size={44} />
            ) : (
              <MicIcon color={colors.onMoon} size={48} />
            )}
          </Pressable>
          <AppText
            variant="title"
            tone={stage === 'recording' ? 'moon' : 'muted'}
            accessibilityLiveRegion="polite"
            accessibilityLabel={
              stage === 'recording' ? `Recording, ${formatDuration(durationMillis)}` : undefined
            }>
            {formatDuration(stage === 'recording' ? durationMillis : 0)}
          </AppText>
          {stage === 'ready' ? (
            <AppText variant="caption" tone="muted" style={styles.center}>
              Anything playing will stop while you record.
            </AppText>
          ) : null}
        </View>
      ) : null}

      {message ? <Notice title="Let’s try that again" body={message} /> : null}

      {(stage === 'review' || stage === 'saving') && take ? (
        <>
          <ListenBack
            uri={take.uri}
            durationMs={take.durationMs}
            range={details.trimSilence ? take.trim : null}
          />
          <DetailsForm details={details} onChange={setDetails} trim={take.trim} />
          <View style={styles.actions}>
            <Button
              label={stage === 'saving' ? 'Saving…' : 'Save'}
              variant="primary"
              disabled={stage === 'saving'}
              onPress={save}
            />
            <Button
              label="Re-record"
              disabled={stage === 'saving'}
              onPress={() => {
                setTake(null);
                setStage('ready');
              }}
              accessibilityHint="Discards this take and records again"
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function EditRecording({ recording }: { recording: Recording }) {
  const updateRecording = useRecordings((s) => s.updateRecording);
  const deleteRecording = useRecordings((s) => s.deleteRecording);
  const [details, setDetails] = useState<Details>({
    name: recording.name,
    icon: recording.icon,
    color: recording.color,
    trimSilence: recording.trimSilence,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(confirmTimer.current ?? undefined), []);
  const source = recordingSource(recording.fileName);

  const save = () => {
    updateRecording(recording.id, details);
    close();
  };

  const remove = () => {
    if (!confirmDelete) {
      // A soft confirm: tap once more within a few seconds.
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    const { program, status } = player.getSnapshot();
    if (program && status !== 'idle' && programSounds(program).some((s) => s.id === recording.id)) {
      player.stop();
    }
    const { favorites } = useSettings.getState();
    if (favorites.includes(recording.id)) useSettings.getState().toggleFavorite(recording.id);
    deleteRecording(recording.id);
    close();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Edit recording" />
      {source ? (
        <ListenBack
          uri={source}
          durationMs={recording.durationMs}
          range={details.trimSilence ? recording.trim : null}
        />
      ) : (
        <Notice
          title="This recording's sound isn't here"
          body={
            RECORDINGS_MAY_BE_CLEARED
              ? 'The browser may have cleared it. If you made a backup, you can restore it from Settings.'
              : 'Its audio file is missing. If you made a backup, you can restore it from Settings.'
          }
        />
      )}
      <DetailsForm details={details} onChange={setDetails} trim={recording.trim} />
      <View style={styles.actions}>
        <Button label="Save changes" variant="primary" onPress={save} />
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <AppText variant="label" tone={confirmDelete ? 'moon' : 'secondary'}>
            {confirmDelete ? 'Tap again to delete' : 'Delete recording'}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.topRow}>
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <ChevronDownIcon color={colors.textSecondary} />
      </Pressable>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.close} />
    </View>
  );
}

/**
 * Plays a take (or a saved recording) once, from the start of the voice
 * when the silence trim is on.
 */
function ListenBack({
  uri,
  durationMs,
  range,
}: {
  uri: string;
  durationMs: number;
  range: TrimRange | null;
}) {
  const preview = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(preview);
  const positionMs = (status.currentTime ?? 0) * 1000;
  const endMs = range?.endMs ?? durationMs;
  const startMs = range?.startMs ?? 0;

  // Stop at the end of the voice when trimmed.
  useEffect(() => {
    if (status.playing && range && positionMs >= range.endMs) {
      preview.pause();
      void preview.seekTo(range.startMs / 1000).catch(() => {});
    }
  }, [status.playing, positionMs, range, preview]);

  const toggle = () => {
    if (status.playing) {
      preview.pause();
      return;
    }
    // One sound at a time: the sleep sound stops while you listen back.
    player.stop();
    if (status.didJustFinish || positionMs < startMs || positionMs >= endMs - 100) {
      void preview.seekTo(startMs / 1000).catch(() => {});
    }
    preview.play();
  };

  const shownMs = Math.min(Math.max(0, positionMs - startMs), endMs - startMs);
  return (
    <View style={styles.listen}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause' : 'Listen back'}
        style={({ pressed }) => [styles.listenButton, pressed && styles.pressed]}>
        {status.playing ? (
          <PauseIcon color={colors.onMoon} size={28} />
        ) : (
          <PlayIcon color={colors.onMoon} size={28} />
        )}
      </Pressable>
      <View style={styles.listenText}>
        <AppText variant="bodyStrong">{status.playing ? 'Playing' : 'Listen back'}</AppText>
        <AppText variant="caption" tone="secondary">
          {formatDuration(shownMs)} / {formatDuration(endMs - startMs)}
        </AppText>
      </View>
    </View>
  );
}

function DetailsForm({
  details,
  onChange,
  trim,
}: {
  details: Details;
  onChange: (details: Details) => void;
  trim: TrimRange | null;
}) {
  const set = (patch: Partial<Details>) => onChange({ ...details, ...patch });
  const tint = RECORDING_COLORS[details.color].hex;
  return (
    <View style={styles.form}>
      <TextInput
        value={details.name}
        onChangeText={(name) => set({ name })}
        placeholder="Name it (e.g. Twinkle, twinkle)"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Recording name"
        maxLength={MAX_RECORDING_NAME}
        style={styles.input}
      />

      <AppText variant="label" tone="secondary">
        Icon
      </AppText>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Icon">
        {RECORDING_ICONS.map(({ key, label }) => {
          const selected = details.icon === key;
          return (
            <Pressable
              key={key}
              onPress={() => set({ icon: key })}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              aria-checked={selected}
              accessibilityLabel={label}
              style={({ pressed }) => [
                styles.iconChoice,
                selected && { borderColor: tint, backgroundColor: colors.surfaceRaised },
                pressed && styles.pressed,
              ]}>
              <SoundIcon name={key} color={selected ? tint : colors.textMuted} size={28} />
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" tone="secondary">
        Color
      </AppText>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Color">
        {(Object.keys(RECORDING_COLORS) as RecordingColor[]).map((key) => {
          const selected = details.color === key;
          return (
            <Pressable
              key={key}
              onPress={() => set({ color: key })}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              aria-checked={selected}
              accessibilityLabel={RECORDING_COLORS[key].label}
              style={({ pressed }) => [
                styles.colorChoice,
                selected && styles.colorChoiceSelected,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.swatch, { backgroundColor: RECORDING_COLORS[key].hex }]} />
            </Pressable>
          );
        })}
      </View>

      {trim ? (
        <SwitchRow
          label="Trim the quiet at the start and end"
          detail="Loops just the part with your voice. The full recording is kept."
          value={details.trimSilence}
          onChange={(trimSilence) => set({ trimSilence })}
        />
      ) : null}
    </View>
  );
}

const RECORD_SIZE = 120;

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
  block: { gap: space.md },
  center: { textAlign: 'center' },
  recordArea: { alignItems: 'center', gap: space.lg, paddingVertical: space.lg },
  recordButton: {
    width: RECORD_SIZE,
    height: RECORD_SIZE,
    borderRadius: RECORD_SIZE / 2,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonOn: { backgroundColor: colors.lavender },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  listenButton: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    backgroundColor: colors.moon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenText: { flex: 1, gap: 2 },
  form: { gap: space.sm },
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
  // Six choices spread across one row on a phone (wrapping only if very narrow).
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.sm,
  },
  iconChoice: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoice: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoiceSelected: { borderColor: colors.text },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  actions: { gap: space.sm, marginTop: space.sm },
  secondary: {
    minHeight: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
