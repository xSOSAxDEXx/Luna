import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { MINUTE } from '@/audio/timer';
import { WAKE_MS } from '@/audio/wake';
import { useSafeSleepReminder } from '@/safety/safeSleep';
import { useSettings } from '@/store/settings';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import PlayerScreen from '../player';

type FakePlayer = { source: unknown; playing: boolean; volume: number };
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

let clock = 0;
/** Controls the clock the player reads. Call after rendering (the router sets up its own). */
function controlClock() {
  clock = Date.now();
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
}

afterEach(() => {
  player.stop();
  fakePlayers().length = 0;
  useSettings.setState({ favorites: [], volume: 0.35, wakeUpEnabled: false, wakeSoundId: 'auto' });
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
  jest.restoreAllMocks();
});

/** Moves the clock on and lets the player catch up, as a heartbeat would. */
async function passTime(ms: number) {
  clock += ms;
  await act(async () => player.tick());
}

async function startBrownNoise() {
  await renderApp();
  controlClock();
  await fireEvent.press(screen.getByRole('button', { name: 'Brown noise' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'I understand' }));
}

describe('gentle wake-up', () => {
  it('is off by default and switched on from the player', async () => {
    await startBrownNoise();
    const toggle = screen.getByRole('switch', { name: 'Gentle wake-up at the end' });
    expect(toggle).not.toBeChecked();
    expect(player.getSnapshot().wakeUp).toBeNull();

    await fireEvent.press(toggle);
    expect(useSettings.getState().wakeUpEnabled).toBe(true);
    expect(player.getSnapshot().wakeUp?.id).toBe('light-chimes');

    // Pick a sound, or leave it on Auto.
    expect(screen.getByRole('radio', { name: 'Auto' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Morning birds (placeholder)' }));
    expect(player.getSnapshot().wakeUp?.id).toBe('morning-birds');
  });

  it('says it needs a timer with "Until I stop"', async () => {
    useSettings.setState({ wakeUpEnabled: true });
    await startBrownNoise();
    await fireEvent.press(screen.getByRole('button', { name: /until i stop/i }));
    expect(screen.getByText(/Needs a timer/)).toBeOnTheScreen();
  });

  it('shows a sunrise during the wake-up, then "Good morning"', async () => {
    useSettings.setState({ wakeUpEnabled: true });
    await startBrownNoise();

    await passTime(10 * MINUTE + 1000);
    expect(player.getSnapshot().phase).toBe('wake');
    expect(await screen.findByText('Waking gently')).toBeOnTheScreen();
    expect(screen.getByText('Waking up to Light chimes')).toBeOnTheScreen();
    // No adding time or changing the wake-up while it runs.
    expect(screen.queryByRole('button', { name: 'Add 5 minutes' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Gentle wake-up at the end' })).toBeNull();
    // Pause still works.
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();

    await passTime(WAKE_MS);
    expect(await screen.findByText('Good morning')).toBeOnTheScreen();
    expect(screen.getByText('The wake-up has finished')).toBeOnTheScreen();
  });
});
