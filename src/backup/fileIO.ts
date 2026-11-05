import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Saving and choosing a backup file on the phone. Saving writes the file to
 * the app's cache and opens the share sheet, so the parent can put it in
 * Files, Drive, email or wherever they like. Nothing is sent anywhere
 * automatically.
 */
export async function saveBackupFile(
  fileName: string,
  json: string,
): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your Luna Beatzzz backup',
  });
  return 'shared';
}

/** Lets the parent choose a backup file. Returns its text, or null if they cancelled. */
export async function pickBackupText(): Promise<string | null> {
  // Any type: cloud drives often label .json files as plain binary.
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', '*/*'] });
  if (picked.canceled) return null;
  return picked.result.text();
}
