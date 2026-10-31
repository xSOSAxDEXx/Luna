import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
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
});

describe('one tap to calm', () => {
  it('plays a sound on a 10-minute timer as soon as its card is tapped', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Brown noise' }));

    const [audio] = fakePlayers();
    expect(audio.playing).toBe(true);
    expect(audio.loop).toBe(true);
    // Starts silent and fades in, never at full blast.
    expect(audio.volume).toBeLessThanOrEqual(0.35);
    expect(audio.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: 'Brown noise',
      artist: 'Luna Beats',
    });

    expect(await screen.findByRole('header', { name: 'Brown noise' })).toBeOnTheScreen();
    expect(screen.getByText('10 min')).toBeOnTheScreen();
  });

  it('adds time with the quick-add buttons and can drop the timer', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Pink noise' }));
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
});
