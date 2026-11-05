import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { useSafeSleepReminder } from '@/safety/safeSleep';
import { useMixes } from '@/store/mixes';
import { useSettings } from '@/store/settings';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import CreateScreen from '../create';
import PlayerScreen from '../player';

type FakePlayer = { source: unknown; playing: boolean; volume: number };
const fakePlayers = (): FakePlayer[] =>
  (jest.requireMock('expo-audio') as { __players: FakePlayer[] }).__players;
const livePlayers = () => fakePlayers().filter((p) => p.playing);

async function renderApp() {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
      create: CreateScreen,
    },
    { initialUrl: '/' },
  );
}

// These tests start with no saved mixes (a new install has the ready-made ones).
beforeEach(() => {
  useMixes.setState({ mixes: [] });
});

afterEach(() => {
  player.stop();
  fakePlayers().length = 0;
  useMixes.setState({ mixes: [] });
  useSettings.setState({ favorites: [], volume: 0.35 });
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
});

const press = async (name: string | RegExp) =>
  fireEvent.press(await screen.findByRole('button', { name }));

describe('Mix', () => {
  it('builds, saves and plays a mix, which then appears in the library', async () => {
    await renderApp();
    await press('Create a mix or shuffle');

    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Brown noise' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Heartbeat' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Music box' }));
    // A fourth can't be added.
    expect(screen.getByRole('checkbox', { name: 'Rain' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Mix name'), 'Nap time');
    await press('Save & play');

    // Three layers playing at once, and the safe-sleep reminder shown.
    expect(livePlayers()).toHaveLength(3);
    expect(await screen.findByRole('header', { name: 'Nap time' })).toBeOnTheScreen();
    expect(screen.getByText('Safe sleep reminder')).toBeOnTheScreen();
    expect(useMixes.getState().mixes).toHaveLength(1);

    await press('I understand');
    expect(screen.getByLabelText('Heartbeat volume')).toBeOnTheScreen();

    await press('Close player');
    expect(
      await screen.findByRole('button', { name: /^Nap time, mix of Brown noise, Heartbeat/ }),
    ).toBeOnTheScreen();
  });

  it('edits and deletes a saved mix, with a soft confirm', async () => {
    useMixes.setState({
      mixes: [
        {
          id: 'm1',
          name: 'Bedtime',
          layers: [
            { soundId: 'brown-noise', volume: 0.8 },
            { soundId: 'heartbeat', volume: 0.5 },
          ],
        },
      ],
    });
    await renderApp();
    await press('Edit Bedtime');
    expect(await screen.findByRole('header', { name: 'Edit mix' })).toBeOnTheScreen();

    await press('Delete mix');
    expect(useMixes.getState().mixes).toHaveLength(1);
    await press('Tap again to delete');
    expect(useMixes.getState().mixes).toHaveLength(0);
  });

  it('plays a saved mix with one tap from the library', async () => {
    useMixes.setState({
      mixes: [
        {
          id: 'm1',
          name: 'Bedtime',
          layers: [
            { soundId: 'brown-noise', volume: 0.8 },
            { soundId: 'pink-noise', volume: 0.5 },
          ],
        },
      ],
    });
    await renderApp();
    await press(/^Bedtime, mix of/);
    expect(livePlayers()).toHaveLength(2);
    expect(player.getSnapshot().program).toMatchObject({ kind: 'mix', id: 'm1' });
  });
});

describe('Shuffle', () => {
  it('shuffles a whole category with one tap', async () => {
    await renderApp();
    await press('Shuffle Noise sounds');
    const snap = player.getSnapshot();
    expect(snap.program).toMatchObject({ kind: 'shuffle', name: 'Noise shuffle' });
    expect(livePlayers()).toHaveLength(1);
    expect(await screen.findByText(`Playing now: ${snap.sound?.name}`)).toBeOnTheScreen();
  });

  it('shuffles a chosen set', async () => {
    await renderApp();
    await press('Create a mix or shuffle');
    await fireEvent.press(await screen.findByRole('radio', { name: /^Shuffle/ }));
    const play = screen.getByRole('button', { name: 'Play shuffle' });
    expect(play).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'White noise' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Rain' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Fan' }));
    await fireEvent.press(play);

    const snap = player.getSnapshot();
    expect(snap.program?.kind).toBe('shuffle');
    expect(snap.program?.kind === 'shuffle' && snap.program.sounds.map((s) => s.id)).toEqual([
      'white-noise',
      'rain',
      'fan',
    ]);
  });
});
