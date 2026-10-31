/** File-name helpers shared by the native and web recording storage. */

/** The extension of a recorder file (".m4a"), defaulting to ".m4a". */
export function extensionOf(uri: string): string {
  const match = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(uri);
  return match ? `.${match[1].toLowerCase()}` : '.m4a';
}

export function mimeTypeFor(fileName: string): string {
  const ext = extensionOf(fileName);
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.3gp') return 'audio/3gpp';
  if (ext === '.caf') return 'audio/x-caf';
  return 'audio/mp4';
}

/** The extension to store a restored recording under, from its type. */
export function extensionForMime(mimeType: string): string {
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('wav')) return '.wav';
  if (mimeType.includes('3gpp')) return '.3gp';
  if (mimeType.includes('caf')) return '.caf';
  return '.m4a';
}
