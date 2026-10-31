import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { useSafeSleepReminder } from '@/safety/safeSleep';
import { findSound, useRecordings } from '@/store/recordings';
import { useSettings } from '@/store/settings';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import PlayerScreen from '../player';
import RecordScreen from '../record';

type FakeAudio = {
  __players: { source: unknown }[];
  __permission: { granted: boolean; canAskAgain: boolean; status: string };
  __recorder: {
    isRecording: boolean;
    durationMillis: number;
    currentTime: number;
    uri: string | null;
    record: jest.Mock;
  };
  requestRecordingPermissionsAsync: jest.Mock;
  setAudioModeAsync: jest.Mock;
};
const audio = () => jest.requireMock('expo-audio') as FakeAudio;
const disk = () =>
  (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

async function renderApp(initialUrl = '/my-sounds') {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
      record: RecordScreen,
    },
    { initialUrl },
  );
}

beforeEach(() => {
  Object.assign(audio().__permission, {
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  });
  Object.assign(audio().__recorder, {
    isRecording: false,
    durationMillis: 0,
    currentTime: 0,
    uri: null,
  });
});

afterEach(() => {
  player.stop();
  audio().__players.length = 0;
  disk().clear();
  useRecordings.setState({ recordings: [] });
  useSettings.setState({ favorites: [] });
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
  jest.clearAllMocks();
});

/** The fake recorder reports this much recorded so far. */
function setTakeLength(ms: number) {
  Object.assign(audio().__recorder, { durationMillis: ms, currentTime: ms / 1000 });
}

/** Records a take of the given length. */
async function recordTake(ms: number) {
  await fireEvent.press(await screen.findByRole('button', { name: 'Start recording' }));
  setTakeLength(ms);
  await fireEvent.press(await screen.findByRole('button', { name: /Stop recording/ }));
}

/** The test router returns to the first tab after a modal; go to My Sounds. */
async function openMySounds() {
  await fireEvent.press(screen.getByLabelText('My Sounds, your recordings'));
}

async function recordAndSave(name: string) {
  audio().__permission.granted = true;
  await fireEvent.press(screen.getByRole('button', { name: 'Record' }));
  await recordTake(45_000);
  await fireEvent.changeText(await screen.findByLabelText('Recording name'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await openMySounds();
  await screen.findByText('Your recordings');
}

describe('recording a lullaby', () => {
  it('starts empty, with a Record button', async () => {
    await renderApp();
    expect(screen.getByText(/Nothing here yet/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Record' })).toBeOnTheScreen();
  });

  it('explains the microphone first, and only asks when the parent agrees', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByText('May Luna Beats use your microphone?')).toBeOnTheScreen();
    expect(screen.getByText(/your recordings stay on this device/)).toBeOnTheScreen();
    expect(audio().requestRecordingPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Allow microphone' }));
    expect(audio().requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Start recording' })).toBeOnTheScreen();
  });

  it('skips the explanation once the microphone is allowed', async () => {
    audio().__permission.granted = true;
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByRole('button', { name: 'Start recording' })).toBeOnTheScreen();
    expect(screen.queryByText('May Luna Beats use your microphone?')).toBeNull();
  });

  it('is gentle when the microphone has been turned off', async () => {
    Object.assign(audio().__permission, { canAskAgain: false, status: 'denied' });
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByText(/switched off for Luna Beats/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeOnTheScreen();
  });

  it('records, listens back, re-records, then saves with a name, icon and color', async () => {
    audio().__permission.granted = true;
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Record' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Start recording' }));
    expect(audio().__recorder.record).toHaveBeenCalled();
    // The microphone needs the recording audio session (iOS).
    expect(audio().setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecording: true }),
    );
    setTakeLength(30_000);
    await fireEvent.press(screen.getByRole('button', { name: /Stop recording/ }));

    // Listen back, then try again.
    expect(await screen.findByRole('button', { name: 'Listen back' })).toBeOnTheScreen();
    expect(audio().setAudioModeAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowsRecording: false, shouldPlayInBackground: true }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Re-record' }));
    await recordTake(40_000);

    await fireEvent.changeText(screen.getByLabelText('Recording name'), 'Bedtime story');
    await fireEvent.press(screen.getByRole('radio', { name: 'Storybook' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Sage' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    // A card like any other sound: in the library's My Sounds section…
    expect(await screen.findByRole('button', { name: 'Bedtime story' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'My Sounds' })).toBeOnTheScreen();
    // …and in My Sounds, with its length.
    await openMySounds();
    expect(await screen.findByText('0:40')).toBeOnTheScreen();
    const [saved] = useRecordings.getState().recordings;
    expect(saved).toMatchObject({ name: 'Bedtime story', icon: 'book', color: 'sage' });
    expect(disk().has(`file:///document/recordings/${saved.fileName}`)).toBe(true);
  });

  it('asks for another go when a take is too short', async () => {
    audio().__permission.granted = true;
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Record' }));
    await recordTake(400);
    expect(await screen.findByText(/a little short/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeOnTheScreen();
  });

  it('stops the sleep sound before recording, so it isn’t in the take', async () => {
    audio().__permission.granted = true;
    await renderApp('/');
    await fireEvent.press(screen.getByRole('button', { name: 'Brown noise' }));
    expect(player.getSnapshot().status).toBe('playing');
    await act(async () => router.push('/record'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Start recording' }));
    expect(player.getSnapshot().status).toBe('idle');
  });
});

describe('a saved recording', () => {
  it('plays like any sound, with the timer', async () => {
    await renderApp();
    await recordAndSave('Twinkle');
    await fireEvent.press(screen.getByRole('button', { name: 'Twinkle' }));
    const snap = player.getSnapshot();
    expect(snap).toMatchObject({ status: 'playing', sound: { name: 'Twinkle' } });
    expect(snap.timer).toMatchObject({ kind: 'countdown' });
    expect(audio().__players.at(-1)?.source).toMatch(/^file:\/\/\/document\/recordings\/rec-/);
    // And the safe-sleep reminder shows, as for every sound.
    expect(await screen.findByRole('button', { name: 'I understand' })).toBeOnTheScreen();
  });

  it('shows in the library and can be shuffled with others', async () => {
    await renderApp();
    await recordAndSave('Song one');
    await recordAndSave('Song two');
    await fireEvent.press(screen.getByRole('button', { name: 'Shuffle my sounds' }));
    expect(player.getSnapshot().program).toMatchObject({ kind: 'shuffle' });
    expect(useRecordings.getState().recordings).toHaveLength(2);
  });

  it('can be renamed, and deleted with a soft confirm', async () => {
    await renderApp();
    await recordAndSave('Old name');
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Old name' }));
    const name = await screen.findByLabelText('Recording name');
    await fireEvent.changeText(name, 'New name');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await openMySounds();
    expect(await screen.findByRole('button', { name: 'New name' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Edit New name' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete recording' }));
    // Nothing gone yet: one more tap is needed.
    expect(useRecordings.getState().recordings).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Tap again to delete' }));
    expect(useRecordings.getState().recordings).toHaveLength(0);
    await openMySounds();
    expect(await screen.findByText(/Nothing here yet/)).toBeOnTheScreen();
    expect([...disk().keys()].some((k) => k.includes('/recordings/'))).toBe(false);
  });

  it('stops playing when it is deleted', async () => {
    await renderApp();
    await recordAndSave('Short song');
    const [rec] = useRecordings.getState().recordings;
    useSettings.getState().toggleFavorite(rec.id);
    await act(async () => player.start(findSound(rec.id)!));
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Short song' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete recording' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tap again to delete' }));
    expect(player.getSnapshot().status).toBe('idle');
    expect(useSettings.getState().favorites).toEqual([]);
  });
});

describe('backup and restore in Settings', () => {
  it('makes a backup file and says so', async () => {
    await renderApp('/settings');
    expect(screen.getByText(/never deletes anything/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Make a backup' }));
    expect(await screen.findByText('All done')).toBeOnTheScreen();
    const sharing = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
    expect(sharing.shareAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the parent cancels choosing a file', async () => {
    await renderApp('/settings');
    await fireEvent.press(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.queryByText('All done')).toBeNull();
    expect(screen.queryByText('That didn’t work')).toBeNull();
  });
});
