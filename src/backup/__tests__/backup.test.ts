import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { keepRecording } from '@/recording/files';
import { useMixes } from '@/store/mixes';
import { findSound, useRecordings } from '@/store/recordings';
import { useSettings } from '@/store/settings';

import { exportBackup, importBackup, restoreFromText } from '../backup';

const disk = () =>
  (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

async function addRecording(id: string, name: string) {
  disk().set(`file:///cache/${id}-take.m4a`, `voice of ${name}`);
  const fileName = await keepRecording(`file:///cache/${id}-take.m4a`, id);
  useRecordings.getState().addRecording({
    id,
    name,
    icon: 'book',
    color: 'sage',
    fileName,
    durationMs: 60_000,
    trim: { startMs: 900, endMs: 58_000 },
    trimSilence: true,
    createdAt: 1,
  });
}

function reset() {
  disk().clear();
  useRecordings.setState({ recordings: [] });
  useMixes.setState({ mixes: [] });
  useSettings.setState({ volume: 0.35, favorites: [], wakeUpEnabled: false, wakeSoundId: 'auto' });
}

/** Makes a backup and returns the file's text. */
async function makeBackup(): Promise<string> {
  const outcome = await exportBackup();
  expect(outcome?.ok).toBe(true);
  const uri = (Sharing.shareAsync as jest.Mock).mock.calls.at(-1)[0] as string;
  return disk().get(uri)!;
}

beforeEach(reset);

describe('backup and restore', () => {
  it('brings everything back on a fresh phone', async () => {
    await addRecording('rec-1', 'Story time');
    useMixes.getState().saveMix({ name: 'Nap', layers: [{ soundId: 'rec-1', volume: 0.6 }] });
    useSettings.setState({ volume: 0.25, favorites: ['rec-1', 'rain'], wakeUpEnabled: true });

    const text = await makeBackup();
    expect(Sharing.shareAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/luna-beats-backup-\d{4}-\d{2}-\d{2}\.json$/),
      expect.objectContaining({ mimeType: 'application/json' }),
    );

    reset();
    const outcome = await restoreFromText(text);
    expect(outcome).toEqual({
      ok: true,
      message: 'Restored 1 recording and 1 mix, and your settings.',
    });

    const [restored] = useRecordings.getState().recordings;
    expect(restored).toMatchObject({
      id: 'rec-1',
      name: 'Story time',
      icon: 'book',
      color: 'sage',
    });
    // The audio came back too, and it plays (with its trim).
    expect(disk().get(`file:///document/recordings/${restored.fileName}`)).toBe(
      'voice of Story time',
    );
    expect(findSound('rec-1')).toMatchObject({ loopRange: { startMs: 900, endMs: 58_000 } });
    expect(useMixes.getState().mixes[0]).toMatchObject({ name: 'Nap' });
    expect(useSettings.getState()).toMatchObject({
      volume: 0.25,
      favorites: ['rec-1', 'rain'],
      wakeUpEnabled: true,
    });
  });

  it('adds to what is already here and never deletes', async () => {
    await addRecording('rec-1', 'Old song');
    const text = await makeBackup();

    reset();
    await addRecording('rec-2', 'New story');
    useSettings.setState({ favorites: ['brown-noise'] });
    await restoreFromText(text);

    expect(useRecordings.getState().recordings.map((r) => r.id)).toEqual(['rec-2', 'rec-1']);
    expect(useSettings.getState().favorites).toEqual(['brown-noise']);

    // Again: nothing new to add.
    const again = await restoreFromText(text);
    expect(again.message).toMatch(/Everything else was already here/);
    expect(useRecordings.getState().recordings).toHaveLength(2);
  });

  it('turns away a file that is not a backup without changing anything', async () => {
    await addRecording('rec-1', 'Keep me');
    const outcome = await restoreFromText('{"hello":"world"}');
    expect(outcome.ok).toBe(false);
    expect(useRecordings.getState().recordings).toHaveLength(1);
  });

  it('does nothing when the parent cancels the file picker', async () => {
    await expect(importBackup()).resolves.toBeNull();
  });

  it('reads the chosen file', async () => {
    await addRecording('rec-1', 'Lullaby');
    const text = await makeBackup();
    reset();
    disk().set('file:///picked/backup.json', text);
    (File.pickFileAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      result: new File('file:///picked/backup.json'),
    });
    const outcome = await importBackup();
    expect(outcome?.ok).toBe(true);
    expect(useRecordings.getState().recordings).toHaveLength(1);
  });

  it('leaves out a recording whose audio has gone, and says so', async () => {
    await addRecording('rec-1', 'Here');
    await addRecording('rec-2', 'Gone');
    disk().delete('file:///document/recordings/rec-2.m4a');
    const outcome = await exportBackup();
    expect(outcome?.message).toMatch(/1 recording couldn't be read/);
  });
});

describe('recordings store', () => {
  it('deletes the audio file with the recording', async () => {
    await addRecording('rec-1', 'Bye');
    expect(disk().has('file:///document/recordings/rec-1.m4a')).toBe(true);
    useRecordings.getState().deleteRecording('rec-1');
    expect(disk().has('file:///document/recordings/rec-1.m4a')).toBe(false);
    expect(findSound('rec-1')).toBeUndefined();
  });

  it('names untitled recordings kindly', async () => {
    await addRecording('rec-1', '   ');
    expect(useRecordings.getState().recordings[0].name).toBe('My recording');
  });
});
