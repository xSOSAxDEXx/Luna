import { logEvent } from '@/diagnostics/log';
import { extensionForMime } from '@/recording/fileNames';
import { readRecordingAudio, writeRecordingAudio } from '@/recording/files';
import { useMixes } from '@/store/mixes';
import { loadFiles, type Recording, useRecordings } from '@/store/recordings';
import { useSettings } from '@/store/settings';

import { pickBackupText, saveBackupFile } from './fileIO';
import {
  type BackupRecording,
  backupFileName,
  buildBackup,
  parseBackup,
  planRestore,
  restoreSummary,
} from './format';

export type BackupOutcome = { ok: boolean; message: string } | null;

/** Builds the backup from what's on this device and hands it to the parent to save. */
export async function exportBackup(): Promise<BackupOutcome> {
  const { volume, favorites, wakeUpEnabled, wakeSoundId, softVolumeCap, quietReminder } =
    useSettings.getState();
  const recordings: BackupRecording[] = [];
  let missing = 0;
  for (const { fileName, ...meta } of useRecordings.getState().recordings) {
    const audio = await readRecordingAudio(fileName);
    if (audio) recordings.push({ ...meta, audio });
    else missing++;
  }
  const backup = buildBackup({
    settings: { volume, favorites, wakeUpEnabled, wakeSoundId, softVolumeCap, quietReminder },
    mixes: useMixes.getState().mixes,
    recordings,
  });
  const result = await saveBackupFile(backupFileName(), JSON.stringify(backup));
  logEvent('backup-export', { recordings: recordings.length, mixes: backup.mixes.length, missing });
  if (result === 'unavailable') {
    return { ok: false, message: "This device can't share files right now. Please try again." };
  }
  return {
    ok: true,
    message:
      missing > 0
        ? `Backup made. ${missing} recording${missing === 1 ? " couldn't" : "s couldn't"} be read and ${missing === 1 ? 'was' : 'were'} left out.`
        : 'Backup made. Keep the file somewhere safe, like Files or your cloud drive.',
  };
}

/**
 * Asks the parent for a backup file and adds what's in it to this device.
 * Returns null if they cancelled.
 */
export async function importBackup(): Promise<BackupOutcome> {
  const text = await pickBackupText();
  if (text == null) return null;
  return restoreFromText(text);
}

/** Restores from a backup file's text. Adds; never deletes. */
export async function restoreFromText(text: string): Promise<{ ok: boolean; message: string }> {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;

  const settings = useSettings.getState();
  const plan = planRestore(
    {
      favorites: settings.favorites,
      mixIds: useMixes.getState().mixes.map((m) => m.id),
      recordingIds: useRecordings.getState().recordings.map((r) => r.id),
    },
    parsed.backup,
  );

  // Audio files first, so a recording never appears without its sound.
  const restored: Recording[] = [];
  for (const { audio, ...meta } of plan.recordings) {
    const fileName = `${meta.id}${extensionForMime(audio.mimeType)}`;
    try {
      await writeRecordingAudio(fileName, audio.base64);
      restored.push({ ...meta, fileName });
    } catch (error) {
      console.warn('Could not restore a recording', error);
    }
  }
  if (restored.length > 0) {
    useRecordings.setState((s) => ({ recordings: [...s.recordings, ...restored] }));
    await loadFiles(restored);
  }

  useMixes.setState((s) => ({ mixes: [...s.mixes, ...plan.mixes] }));
  useSettings.setState({
    volume: plan.settings.volume,
    favorites: plan.settings.favorites,
    wakeUpEnabled: plan.settings.wakeUpEnabled,
    wakeSoundId: plan.settings.wakeSoundId,
    softVolumeCap: plan.settings.softVolumeCap,
    quietReminder: plan.settings.quietReminder,
  });

  logEvent('backup-restore', {
    recordings: restored.length,
    recordingsFailed: plan.recordings.length - restored.length,
    mixes: plan.mixes.length,
  });
  const failed = plan.recordings.length - restored.length;
  const summary = restoreSummary({ mixes: plan.mixes.length, recordings: restored.length });
  return {
    ok: true,
    message:
      failed > 0
        ? `${summary} ${failed} recording${failed === 1 ? '' : 's'} couldn't be restored.`
        : summary,
  };
}
