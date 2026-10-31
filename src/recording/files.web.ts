/**
 * Web version of recording storage: the audio is kept in this browser
 * (IndexedDB), on this device only. Nothing is uploaded.
 *
 * Browsers may clear a site's storage (Safari does after weeks without a
 * visit, or when space runs low), so the app suggests a backup or the
 * installed app for anything precious. We also ask the browser to keep
 * the storage ("persistent storage") where it supports that.
 */
import { extensionForMime, extensionOf, mimeTypeFor } from './fileNames';

export { extensionOf, mimeTypeFor };

const DB_NAME = 'luna-recordings';
const STORE = 'audio';

/** Object URLs for loaded recordings, by file name. */
const urls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function remember(fileName: string, blob: Blob): void {
  const old = urls.get(fileName);
  if (old) URL.revokeObjectURL(old);
  urls.set(fileName, URL.createObjectURL(blob));
}

function askToKeepStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => {});
  } catch {
    // Not supported: nothing to do.
  }
}

/** Keeps a finished take (a blob: URL from the recorder). Returns its file name. */
export async function keepRecording(tempUri: string, id: string): Promise<string> {
  const blob = await (await fetch(tempUri)).blob();
  const ext = blob.type ? extensionForMime(blob.type) : extensionOf(tempUri);
  const fileName = `${id}${ext}`;
  await withStore('readwrite', (store) => store.put(blob, fileName));
  remember(fileName, blob);
  askToKeepStorage();
  return fileName;
}

/** Loads saved recordings from the browser so they can play. */
export async function loadRecordingFiles(fileNames: string[]): Promise<void> {
  for (const fileName of fileNames) {
    if (urls.has(fileName)) continue;
    try {
      const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(fileName));
      if (blob) remember(fileName, blob);
    } catch (error) {
      console.warn('Could not load a recording', error);
    }
  }
}

export function recordingSource(fileName: string): string | null {
  return urls.get(fileName) ?? null;
}

export function deleteRecordingFile(fileName: string): void {
  const url = urls.get(fileName);
  if (url) URL.revokeObjectURL(url);
  urls.delete(fileName);
  void withStore('readwrite', (store) => store.delete(fileName)).catch(() => {});
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function readRecordingAudio(
  fileName: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(fileName));
  if (!blob) return null;
  return { base64: await blobToBase64(blob), mimeType: blob.type || mimeTypeFor(fileName) };
}

export async function writeRecordingAudio(fileName: string, base64: string): Promise<void> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeTypeFor(fileName) });
  await withStore('readwrite', (store) => store.put(blob, fileName));
  remember(fileName, blob);
  askToKeepStorage();
}

export const RECORDINGS_MAY_BE_CLEARED = true;
