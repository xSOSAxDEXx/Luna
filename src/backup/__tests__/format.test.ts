import {
  type Backup,
  backupFileName,
  buildBackup,
  parseBackup,
  planRestore,
  restoreSummary,
} from '../format';

const recording = {
  id: 'rec-abc-12345',
  name: 'Twinkle, twinkle',
  icon: 'note' as const,
  color: 'gold' as const,
  durationMs: 90_000,
  trim: { startMs: 1_200, endMs: 85_000 },
  trimSilence: true,
  createdAt: 1_790_000_000_000,
  audio: { mimeType: 'audio/mp4', base64: 'AAAAGGZ0eXBtcDQy' },
};

function backup(overrides: Partial<Backup> = {}): Backup {
  return {
    ...buildBackup({
      settings: {
        volume: 0.3,
        favorites: ['rain'],
        wakeUpEnabled: true,
        wakeSoundId: 'auto',
        softVolumeCap: true,
        quietReminder: 'daily',
      },
      mixes: [{ id: 'mix-1', name: 'Nap time', layers: [{ soundId: 'rain', volume: 0.8 }] }],
      recordings: [recording],
      now: new Date('2026-10-31T21:00:00Z'),
    }),
    ...overrides,
  };
}

describe('backup format', () => {
  it('round-trips everything through JSON', () => {
    const parsed = parseBackup(JSON.stringify(backup()));
    expect(parsed).toEqual({ ok: true, backup: backup() });
  });

  it('names the file by the local date', () => {
    expect(backupFileName(new Date(2026, 9, 31, 22, 15))).toBe('luna-beats-backup-2026-10-31.json');
  });

  it('turns away files that are not backups, kindly', () => {
    for (const text of ['not json', '{}', '[]', JSON.stringify({ format: 'other' })]) {
      const parsed = parseBackup(text);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.message).toMatch(/doesn't look like a Luna Beats backup/);
    }
  });

  it('asks for an update when the backup is from a newer version', () => {
    const parsed = parseBackup(JSON.stringify(backup({ version: 99 })));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(/newer version/);
  });

  it('keeps the readable parts and drops the rest', () => {
    const raw = JSON.parse(JSON.stringify(backup()));
    raw.settings.volume = 7; // clamped (to the soft cap), not rejected
    raw.mixes.push({ id: 'mix-2', name: 'Empty', layers: [] }, 'junk');
    raw.recordings.push(
      { ...recording, id: '../../evil', audio: recording.audio },
      { ...recording, id: 'rec-2', audio: { mimeType: 'text/html', base64: 'AAAA' } },
      { ...recording, id: 'rec-3', audio: { mimeType: 'audio/mp4', base64: 'not base64!' } },
      { ...recording, id: 'rec-4', icon: 'rocket', color: 'neon', trim: { startMs: 5, endMs: 1 } },
    );
    const parsed = parseBackup(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.backup.settings.volume).toBe(0.6);
    expect(parsed.backup.mixes.map((m) => m.id)).toEqual(['mix-1']);
    expect(parsed.backup.recordings.map((r) => r.id)).toEqual(['rec-abc-12345', 'rec-4']);
    // Unknown choices fall back to the defaults.
    expect(parsed.backup.recordings[1]).toMatchObject({ icon: 'note', color: 'gold', trim: null });
  });
  it('reads older backups without the cap or reminder settings, gently', () => {
    const raw = JSON.parse(JSON.stringify(backup()));
    delete raw.settings.softVolumeCap;
    delete raw.settings.quietReminder;
    raw.settings.volume = 0.9;
    const parsed = parseBackup(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.backup.settings).toMatchObject({
      softVolumeCap: true,
      quietReminder: 'always',
      volume: 0.6,
    });
  });
});

describe('planRestore', () => {
  it('adds what is missing, keeps what is here, and combines favorites', () => {
    const plan = planRestore(
      { favorites: ['brown-noise'], mixIds: ['mix-1'], recordingIds: [] },
      backup(),
    );
    expect(plan.settings).toMatchObject({ volume: 0.3, favorites: ['brown-noise', 'rain'] });
    expect(plan.mixes).toEqual([]); // already here
    expect(plan.recordings.map((r) => r.id)).toEqual(['rec-abc-12345']);
  });

  it('restoring the same backup twice adds nothing the second time', () => {
    const plan = planRestore(
      { favorites: ['rain'], mixIds: ['mix-1'], recordingIds: ['rec-abc-12345'] },
      backup(),
    );
    expect(plan.mixes).toEqual([]);
    expect(plan.recordings).toEqual([]);
    expect(plan.settings.favorites).toEqual(['rain']);
  });
});

describe('restoreSummary', () => {
  it('says what came back', () => {
    expect(restoreSummary({ recordings: 1, mixes: 2 })).toBe(
      'Restored 1 recording and 2 mixes, and your settings.',
    );
    expect(restoreSummary({ recordings: 0, mixes: 0 })).toMatch(/already here/);
  });
});
