import { Directory, File, Paths } from 'expo-file-system';

import { extensionOf, mimeTypeFor } from './fileNames';

export { extensionOf, mimeTypeFor };

/**
 * Where recordings live on the phone: the app's own documents folder, which
 * the OS keeps (unlike the cache) and which only this app can read. Nothing
 * is uploaded anywhere.
 *
 * The web version (files.web.ts) keeps them in the browser instead.
 */

function folder(): Directory {
  const dir = new Directory(Paths.document, 'recordings');
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function fileFor(fileName: string): File {
  return new File(folder(), fileName);
}

/** Moves a finished take from the recorder's temporary file into storage. Returns its file name. */
export async function keepRecording(tempUri: string, id: string): Promise<string> {
  const fileName = `${id}${extensionOf(tempUri)}`;
  const target = fileFor(fileName);
  if (target.exists) target.delete();
  await new File(tempUri).copy(target);
  return fileName;
}

/** Nothing to load on native: files are read straight from disk. */
export async function loadRecordingFiles(_fileNames: string[]): Promise<void> {}

/** What the player plays for a stored recording, or null if the file has gone. */
export function recordingSource(fileName: string): string | null {
  const file = fileFor(fileName);
  return file.exists ? file.uri : null;
}

export function deleteRecordingFile(fileName: string): void {
  const file = fileFor(fileName);
  if (file.exists) file.delete();
}

/** For backups: the recording's audio as base64, with its type. */
export async function readRecordingAudio(
  fileName: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const file = fileFor(fileName);
  if (!file.exists) return null;
  return { base64: await file.base64(), mimeType: mimeTypeFor(fileName) };
}

/** For restores: writes a recording's audio from a backup. */
export async function writeRecordingAudio(fileName: string, base64: string): Promise<void> {
  const file = fileFor(fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(base64, { encoding: 'base64' });
}

/** Recordings on the web may be cleared by the browser; on the phone they're kept. */
export const RECORDINGS_MAY_BE_CLEARED = false;
