/**
 * The backup file (CLAUDE.md §2, §3.6): one JSON file with the parent's
 * settings, favourites, saved mixes and recordings (audio included, as
 * base64). It's made on the device and goes only where the parent sends it.
 *
 * Restoring adds to what's already on the device and never deletes anything.
 */
import { MAX_MIX_LAYERS } from '@/audio/program';
import type { SoundIcon } from '@/data/sounds';
import type { TrimRange } from '@/recording/trim';
import type { SavedMix } from '@/store/mixes';
import { clampVolume, type QuietReminder } from '@/store/settings';
import {
  cleanName,
  RECORDING_COLORS,
  RECORDING_ICONS,
  type Recording,
  type RecordingColor,
} from '@/store/recordings';

export const BACKUP_FORMAT = 'luna-beats-backup';
export const BACKUP_VERSION = 1;

export type BackupSettings = {
  volume: number;
  favorites: string[];
  wakeUpEnabled: boolean;
  wakeSoundId: string;
  softVolumeCap: boolean;
  quietReminder: QuietReminder;
};

export type BackupRecording = Omit<Recording, 'fileName'> & {
  audio: { mimeType: string; base64: string };
};

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  settings: BackupSettings;
  mixes: SavedMix[];
  recordings: BackupRecording[];
};

export function buildBackup(parts: {
  settings: BackupSettings;
  mixes: SavedMix[];
  recordings: BackupRecording[];
  now?: Date;
}): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: (parts.now ?? new Date()).toISOString(),
    settings: parts.settings,
    mixes: parts.mixes,
    recordings: parts.recordings,
  };
}

/** e.g. "luna-beats-backup-2026-10-31.json" (the local date). */
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `luna-beats-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; message: string };

const NOT_A_BACKUP =
  "This doesn't look like a Luna Beatzzz backup. Choose the file that starts with “luna-beats-backup”.";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v != null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function parseSettings(raw: unknown): BackupSettings | null {
  if (!isObject(raw)) return null;
  const volume = typeof raw.volume === 'number' && Number.isFinite(raw.volume) ? raw.volume : null;
  if (volume == null) return null;
  // Missing in older backups: the gentle defaults (cap on, remind every time).
  const softVolumeCap = raw.softVolumeCap !== false;
  return {
    volume: clampVolume(volume, softVolumeCap),
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(isString) : [],
    wakeUpEnabled: raw.wakeUpEnabled === true,
    wakeSoundId: isString(raw.wakeSoundId) ? raw.wakeSoundId : 'auto',
    softVolumeCap,
    quietReminder:
      raw.quietReminder === 'daily' || raw.quietReminder === 'never' ? raw.quietReminder : 'always',
  };
}

function parseMix(raw: unknown): SavedMix | null {
  if (!isObject(raw) || !isString(raw.id) || !isString(raw.name) || !Array.isArray(raw.layers)) {
    return null;
  }
  const layers = raw.layers
    .filter(
      (l): l is { soundId: string; volume: number } =>
        isObject(l) && isString(l.soundId) && typeof l.volume === 'number',
    )
    .slice(0, MAX_MIX_LAYERS)
    .map((l) => ({ soundId: l.soundId, volume: clamp01(l.volume) }));
  if (layers.length === 0) return null;
  return { id: raw.id, name: raw.name.trim() || 'My mix', layers };
}

function parseTrim(raw: unknown): TrimRange | null {
  if (!isObject(raw)) return null;
  const { startMs, endMs } = raw;
  if (typeof startMs !== 'number' || typeof endMs !== 'number') return null;
  if (!(startMs >= 0 && endMs > startMs)) return null;
  return { startMs, endMs };
}

const ICONS = new Set<string>(RECORDING_ICONS.map((i) => i.key));
// Base64 only: the audio goes straight into a file.
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function parseRecording(raw: unknown): BackupRecording | null {
  if (!isObject(raw) || !isString(raw.id) || !/^rec-[a-z0-9-]+$/i.test(raw.id)) return null;
  const audio = raw.audio;
  if (!isObject(audio) || !isString(audio.base64) || !isString(audio.mimeType)) return null;
  if (audio.base64.length === 0 || !BASE64.test(audio.base64)) return null;
  if (!audio.mimeType.startsWith('audio/')) return null;
  return {
    id: raw.id,
    name: cleanName(isString(raw.name) ? raw.name : ''),
    icon: isString(raw.icon) && ICONS.has(raw.icon) ? (raw.icon as SoundIcon) : 'note',
    color:
      isString(raw.color) && raw.color in RECORDING_COLORS ? (raw.color as RecordingColor) : 'gold',
    durationMs: typeof raw.durationMs === 'number' ? Math.max(0, raw.durationMs) : 0,
    trim: parseTrim(raw.trim),
    trimSilence: raw.trimSilence !== false,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    audio: { mimeType: audio.mimeType, base64: audio.base64 },
  };
}

/** Reads a backup file, keeping every part that's readable. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: NOT_A_BACKUP };
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, message: NOT_A_BACKUP };
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      message:
        'This backup was made by a newer version of Luna Beatzzz. Update the app, then try again.',
    };
  }
  const settings = parseSettings(raw.settings);
  if (!settings) return { ok: false, message: NOT_A_BACKUP };
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: isString(raw.exportedAt) ? raw.exportedAt : '',
      settings,
      mixes: list(raw.mixes)
        .map(parseMix)
        .filter((m): m is SavedMix => m != null),
      recordings: list(raw.recordings)
        .map(parseRecording)
        .filter((r): r is BackupRecording => r != null),
    },
  };
}

export type RestorePlan = {
  settings: BackupSettings;
  /** Mixes and recordings that aren't on this device yet. */
  mixes: SavedMix[];
  recordings: BackupRecording[];
};

/**
 * What a restore will change. Settings come from the backup (favourites are
 * combined); mixes and recordings already on this device are left as they are.
 */
export function planRestore(
  current: { favorites: string[]; mixIds: string[]; recordingIds: string[] },
  backup: Backup,
): RestorePlan {
  const mixIds = new Set(current.mixIds);
  const recordingIds = new Set(current.recordingIds);
  return {
    settings: {
      ...backup.settings,
      favorites: [...new Set([...current.favorites, ...backup.settings.favorites])],
    },
    mixes: backup.mixes.filter((m) => !mixIds.has(m.id)),
    recordings: backup.recordings.filter((r) => !recordingIds.has(r.id)),
  };
}

/** A short, kind summary of a finished restore. */
export function restoreSummary(plan: { mixes: number; recordings: number }): string {
  const parts: string[] = [];
  if (plan.recordings > 0) {
    parts.push(`${plan.recordings} recording${plan.recordings === 1 ? '' : 's'}`);
  }
  if (plan.mixes > 0) parts.push(`${plan.mixes} mix${plan.mixes === 1 ? '' : 'es'}`);
  if (parts.length === 0) return 'Your settings are restored. Everything else was already here.';
  return `Restored ${parts.join(' and ')}, and your settings.`;
}
