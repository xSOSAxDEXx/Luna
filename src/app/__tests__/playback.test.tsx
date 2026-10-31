import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { SAFE_SLEEP, useSafeSleepReminder } from '@/safety/safeSleep';
import { useSettings } from '@/store/settings';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import PlayerScreen from '../player';

type FakePlayer = {
  loop: boolean;
  volume: number;
  playing: boolean;
  removed: boolean;
  setActiveForLockScreen: jest.Mock;
};
// The expo-audio fake from jest.setup.ts records every player it creates.
const fakePlayers = (): FakePlayer[] =>
  (jest.requireMock('expo-audio') as { __players: FakePlayer[] }).__players;

async function renderApp() {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
    },
    { initialUrl: '/' },
  );
}

afterEach(() => {
  player.stop();
  fakePlayers().length = 0;
  useSettings.setState({ favorites: [], volume: 0.35 });
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
});

/** Acknowledges the safe-sleep reminder so the timer ring is shown. */
async function acknowledgeSafety() {
  await fireEvent.press(await screen.findByRole('button', { name: 'I understand' }));
}

describe('one tap to calm', () => {
  it('plays a sound on a 10-minute timer as soon as its card is tapped', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Brown noise' }));

    const [audio] = fakePlayers();
    expect(audio.playing).toBe(true);
    expect(audio.loop).toBe(true);
    // Starts silent and fades in, never at full blast.
    expect(audio.volume).toBeLessThanOrEqual(0.35);
    expect(audio.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      { title: 'Brown noise', artist: '10 min', albumTitle: 'Luna Beats' },
      { isLiveStream: true },
    );

    expect(await screen.findByRole('header', { name: 'Brown noise' })).toBeOnTheScreen();
    await acknowledgeSafety();
    expect(screen.getByText('10 min')).toBeOnTheScreen();
  });

  it('adds time with the quick-add buttons and can drop the timer', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Pink noise' }));
    await acknowledgeSafety();
    await screen.findByText('10 min');

    await fireEvent.press(screen.getByRole('button', { name: 'Add 5 minutes' }));
    expect(await screen.findByText('15 min')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add 30 minutes' }));
    expect(await screen.findByText('45 min')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Play until I stop' }));
    expect(await screen.findByText('Until you stop')).toBeOnTheScreen();
  });

  it('pauses, resumes and stops', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'White noise' }));
    const [audio] = fakePlayers();

    await acknowledgeSafety();
    await fireEvent.press(await screen.findByRole('button', { name: 'Pause' }));
    expect(audio.playing).toBe(false);
    expect(await screen.findByText('Paused')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(audio.playing).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    expect(player.getSnapshot().status).toBe('idle');
  });

  it('pins favorites to the top of the library', async () => {
    await renderApp();
    expect(screen.queryByRole('header', { name: 'Favorites' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add Rain to favorites' }));
    expect(await screen.findByRole('header', { name: 'Favorites' })).toBeOnTheScreen();
    expect(useSettings.getState().favorites).toEqual(['rain']);
    // Rain now appears twice: in Favorites and in Nature.
    expect(screen.getAllByRole('button', { name: /^Rain/ })).toHaveLength(2);

    const [unfavorite] = screen.getAllByRole('button', { name: 'Remove Rain from favorites' });
    await fireEvent.press(unfavorite);
    expect(screen.queryByRole('header', { name: 'Favorites' })).toBeNull();
  });

  it('marks unsourced sounds as placeholders', async () => {
    await renderApp();
    const rain = screen.getByRole('button', { name: 'Rain, placeholder sound' });
    expect(within(rain).getByText('Placeholder')).toBeOnTheScreen();
  });

  it('shows the safe-sleep reminder every time a sound starts, while it plays', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'White noise' }));

    // The sound is already playing behind the reminder: one tap to calm.
    expect(fakePlayers()[0].playing).toBe(true);
    expect(await screen.findByText(SAFE_SLEEP.title)).toBeOnTheScreen();
    for (const point of SAFE_SLEEP.points) expect(screen.getByText(point)).toBeOnTheScreen();
    expect(screen.queryByText('10 min')).toBeNull();

    await acknowledgeSafety();
    expect(screen.queryByText(SAFE_SLEEP.title)).toBeNull();
    expect(screen.getByText('10 min')).toBeOnTheScreen();

    // Pausing and resuming the same sound doesn't bring it back...
    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(screen.queryByText(SAFE_SLEEP.title)).toBeNull();

    // ...but starting a sound again does.
    await fireEvent.press(screen.getByRole('button', { name: 'Close player' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Brown noise' }));
    expect(await screen.findByText(SAFE_SLEEP.title)).toBeOnTheScreen();
  });

  it('keeps the safe-sleep guidance in Settings, with no way to turn it off', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText(SAFE_SLEEP.title)).toBeOnTheScreen();
    expect(screen.getByText(SAFE_SLEEP.points[1])).toBeOnTheScreen();
  });
});
