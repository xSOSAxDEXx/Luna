import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getSound, type Sound, type SoundIcon } from '@/data/sounds';
import { deleteRecordingFile, loadRecordingFiles, recordingSource } from '@/recording/files';
import type { TrimRange } from '@/recording/trim';
import { colors } from '@/theme';

/** Icons a parent can pick for a recording. */
export const RECORDING_ICONS: { key: SoundIcon; label: string }[] = [
  { key: 'note', label: 'Music note' },
  { key: 'book', label: 'Storybook' },
  { key: 'heart', label: 'Heart' },
  { key: 'moon', label: 'Moon' },
  { key: 'star', label: 'Star' },
  { key: 'leaf', label: 'Leaf' },
];

/** Colours a parent can pick, all from the night palette. */
export const RECORDING_COLORS = {
  gold: { label: 'Moon gold', hex: colors.category.mine },
  lavender: { label: 'Lavender', hex: colors.lavender },
  lilac: { label: 'Lilac', hex: colors.category.music },
  sage: { label: 'Sage', hex: colors.category.nature },
  rose: { label: 'Rose', hex: colors.category.rhythmic },
  periwinkle: { label: 'Periwinkle', hex: colors.category.noise },
} as const;
export type RecordingColor = keyof typeof RECORDING_COLORS;

/** A parent's recording (a lullaby or story). The audio itself is a file on the device. */
export type Recording = {
  id: string;
  name: string;
  icon: SoundIcon;
  color: RecordingColor;
  /** In the recordings folder (native) or the browser's storage (web). */
  fileName: string;
  durationMs: number;
  /** Where the voice starts and ends, if there was silence worth trimming. */
  trim: TrimRange | null;
  /** The parent's choice: loop only the trimmed part. On by default. */
  trimSilence: boolean;
  createdAt: number;
};

export type RecordingPatch = Partial<Pick<Recording, 'name' | 'icon' | 'color' | 'trimSilence'>>;

type RecordingsState = {
  recordings: Recording[];
  /**
   * Bumped when recording files finish loading (web), so cards that were
   * waiting for their audio show up.
   */
  filesVersion: number;
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, patch: RecordingPatch) => void;
  /** Removes a recording and its audio file. */
  deleteRecording: (id: string) => void;
};

export const MAX_RECORDING_NAME = 40;

export function newRecordingId(now = Date.now()): string {
  return `rec-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cleanName(name: string): string {
  return name.trim().slice(0, MAX_RECORDING_NAME) || 'My recording';
}

/** Recordings, kept on this device. Included in backup and restore. */
export const useRecordings = create<RecordingsState>()(
  persist(
    (set, get) => ({
      recordings: [],
      filesVersion: 0,
      addRecording: (recording) =>
        set({
          recordings: [
            ...get().recordings.filter((r) => r.id !== recording.id),
            { ...recording, name: cleanName(recording.name) },
          ],
        }),
      updateRecording: (id, patch) =>
        set({
          recordings: get().recordings.map((r) =>
            r.id === id
              ? { ...r, ...patch, name: patch.name != null ? cleanName(patch.name) : r.name }
              : r,
          ),
        }),
      deleteRecording: (id) => {
        const recording = get().recordings.find((r) => r.id === id);
        if (!recording) return;
        try {
          deleteRecordingFile(recording.fileName);
        } catch (error) {
          console.warn('Could not delete the recording file', error);
        }
        set({ recordings: get().recordings.filter((r) => r.id !== id) });
      },
    }),
    {
      name: 'luna-recordings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ recordings }) => ({ recordings }),
      onRehydrateStorage: () => (state) => {
        if (state) void loadFiles(state.recordings);
      },
    },
  ),
);

/** Makes sure the audio for these recordings is ready to play (web keeps it in the browser). */
export async function loadFiles(recordings: Recording[]): Promise<void> {
  await loadRecordingFiles(recordings.map((r) => r.fileName));
  useRecordings.setState((s) => ({ filesVersion: s.filesVersion + 1 }));
}

/** A recording as a playable card, or null while its audio isn't available. */
export function recordingToSound(recording: Recording): Sound | null {
  const source = recordingSource(recording.fileName);
  if (!source) return null;
  return {
    id: recording.id,
    name: recording.name,
    category: 'mine',
    icon: recording.icon,
    tint: RECORDING_COLORS[recording.color]?.hex ?? colors.category.mine,
    file: recording.fileName,
    source,
    placeholder: false,
    loopRange: recording.trimSilence && recording.trim ? recording.trim : undefined,
  };
}

export function getRecording(id: string): Recording | undefined {
  return useRecordings.getState().recordings.find((r) => r.id === id);
}

/** Any sound by id: built-in, or one of the parent's recordings. */
export function findSound(id: string): Sound | undefined {
  const builtIn = getSound(id);
  if (builtIn) return builtIn;
  const recording = getRecording(id);
  return recording ? (recordingToSound(recording) ?? undefined) : undefined;
}

/** The parent's recordings that are ready to play, oldest first. */
export function useRecordingSounds(): Sound[] {
  const recordings = useRecordings((s) => s.recordings);
  const filesVersion = useRecordings((s) => s.filesVersion);
  return playableRecordings(recordings, filesVersion);
}

/**
 * `filesVersion` is passed so a memoising compiler re-runs this when files
 * finish loading, even if the list itself hasn't changed.
 */
function playableRecordings(recordings: Recording[], _filesVersion: number): Sound[] {
  return recordings.map(recordingToSound).filter((s): s is Sound => s != null);
}
