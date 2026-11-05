import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { QUIET_PHONE, useQuietPhone } from '@/safety/quietPhone';
import { SAFE_SLEEP, useSafeSleepReminder } from '@/safety/safeSleep';
import { SOFT_VOLUME_CAP, useSettings } from '@/store/settings';
import { DIM_AFTER_MS } from '@/theme';
import { AFFIRMATIONS } from '@/data/affirmations';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import PlayerScreen from '../player';
import PrivacyScreen from '../privacy';
import WelcomeScreen from '../welcome';

const fakePlayers = () =>
  (jest.requireMock('expo-audio') as { __players: { volume: number }[] }).__players;

async function renderApp(initialUrl = '/') {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
      welcome: WelcomeScreen,
      privacy: PrivacyScreen,
    },
    { initialUrl },
  );
}

let clock = 0;
function controlClock() {
  clock = Date.now();
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
}

afterEach(() => {
  player.stop();
  fakePlayers().length = 0;
  useSettings.setState({
    volume: 0.35,
    softVolumeCap: true,
    quietReminder: 'always',
    quietShownOn: '',
  });
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
  useQuietPhone.setState({ dismissedSession: 0, shownSession: 0 });
  jest.restoreAllMocks();
});

async function startBrownNoise() {
  await fireEvent.press(screen.getByRole('button', { name: 'Brown noise' }));
}
async function acknowledgeSafety() {
  await fireEvent.press(await screen.findByRole('button', { name: SAFE_SLEEP.acknowledge }));
}
async function backToLibrary() {
  await fireEvent.press(screen.getByRole('button', { name: 'Close player' }));
}

describe('welcome (first launch)', () => {
  it('shows once, with the volume and distance tip, and never again', async () => {
    useSettings.setState({ onboarded: false });
    await renderApp();
    expect(await screen.findByText('Welcome to Luna Beatzzz')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Soft, and across the room')).toBeOnTheScreen();
    expect(screen.getByText(/across the room from the crib/)).toBeOnTheScreen();
    expect(screen.getByText(/charger plugged in near your baby/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(QUIET_PHONE.title)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Begin' }));
    expect(useSettings.getState().onboarded).toBe(true);
    expect(await screen.findByRole('button', { name: 'Brown noise' })).toBeOnTheScreen();
  });

  it('can be skipped', async () => {
    useSettings.setState({ onboarded: false });
    await renderApp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Skip' }));
    expect(useSettings.getState().onboarded).toBe(true);
  });

  it('does not show for someone who has seen it', async () => {
    await renderApp();
    expect(screen.queryByText('Welcome to Luna Beatzzz')).toBeNull();
  });
});

describe('quiet your phone', () => {
  it('follows the safe-sleep reminder when a sound starts, and can be dismissed', async () => {
    await renderApp();
    await startBrownNoise();
    // The safety reminder comes first, on its own.
    expect(screen.queryByText(QUIET_PHONE.body)).toBeNull();
    await acknowledgeSafety();
    expect(screen.getByText(QUIET_PHONE.title)).toBeOnTheScreen();
    expect(screen.getByText(QUIET_PHONE.body)).toBeOnTheScreen();
    // iPhone can't open Focus from an app, so it explains where to go.
    expect(screen.getByText(QUIET_PHONE.iosHint)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: `Dismiss: ${QUIET_PHONE.title}` }));
    expect(screen.queryByText(QUIET_PHONE.body)).toBeNull();
  });

  it('shows every time by default', async () => {
    await renderApp();
    await startBrownNoise();
    await acknowledgeSafety();
    await fireEvent.press(screen.getByRole('button', { name: `Dismiss: ${QUIET_PHONE.title}` }));
    await backToLibrary();
    await fireEvent.press(await screen.findByRole('button', { name: 'Pink noise' }));
    await acknowledgeSafety();
    expect(screen.getByText(QUIET_PHONE.body)).toBeOnTheScreen();
  });

  it('"once a day" shows on the first sound of the day only', async () => {
    useSettings.setState({ quietReminder: 'daily' });
    await renderApp();
    await startBrownNoise();
    await acknowledgeSafety();
    expect(screen.getByText(QUIET_PHONE.body)).toBeOnTheScreen();
    await backToLibrary();
    await fireEvent.press(await screen.findByRole('button', { name: 'Pink noise' }));
    await acknowledgeSafety();
    expect(screen.queryByText(QUIET_PHONE.body)).toBeNull();
  });

  it('"never" is set in Settings, and the safe-sleep reminder still shows', async () => {
    await renderApp('/settings');
    await fireEvent.press(screen.getByRole('radio', { name: 'Never' }));
    expect(useSettings.getState().quietReminder).toBe('never');
    await act(async () => player.start({ id: 'x', name: 'Test', source: 1 }));
    await act(async () => {
      const { router } = jest.requireActual('expo-router') as typeof import('expo-router');
      router.push('/player');
    });
    expect(await screen.findByText(SAFE_SLEEP.title)).toBeOnTheScreen();
    await acknowledgeSafety();
    expect(screen.queryByText(QUIET_PHONE.body)).toBeNull();
  });
});

describe('dim mode', () => {
  it('dims after a few quiet seconds while playing, and a tap wakes it', async () => {
    await renderApp();
    await startBrownNoise();
    await acknowledgeSafety();
    controlClock();
    clock += DIM_AFTER_MS + 1000;
    const dim = await screen.findByRole(
      'button',
      { name: /Screen dimmed, 10 min/ },
      { timeout: 3000 },
    );
    await fireEvent.press(dim);
    expect(screen.queryByRole('button', { name: /Screen dimmed/ })).toBeNull();
  });

  jest.setTimeout(15_000);

  it('never dims over the safe-sleep reminder', async () => {
    await renderApp();
    await startBrownNoise();
    controlClock();
    clock += DIM_AFTER_MS * 3;
    // renderRouter runs on Jest's fake timers.
    await act(async () => jest.advanceTimersByTime(1500));
    expect(screen.queryByRole('button', { name: /Screen dimmed/ })).toBeNull();
    expect(screen.getByText(SAFE_SLEEP.title)).toBeOnTheScreen();
  });

  it('stays bright while paused', async () => {
    await renderApp();
    await startBrownNoise();
    await acknowledgeSafety();
    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    controlClock();
    clock += DIM_AFTER_MS * 3;
    // renderRouter runs on Jest's fake timers.
    await act(async () => jest.advanceTimersByTime(1500));
    expect(screen.queryByRole('button', { name: /Screen dimmed/ })).toBeNull();
  });
});

describe('soft volume cap', () => {
  it('is on by default and keeps the volume soft', async () => {
    await renderApp();
    await startBrownNoise();
    await acknowledgeSafety();
    const slider = screen.getByRole('adjustable', { name: 'Volume' });
    expect(slider.props.accessibilityValue).toMatchObject({ max: SOFT_VOLUME_CAP * 100 });
    useSettings.getState().setVolume(1);
    expect(useSettings.getState().volume).toBe(SOFT_VOLUME_CAP);
  });

  it('can be switched off in Settings, and back on lowers a loud volume', async () => {
    await renderApp('/settings');
    expect(screen.getByText(/across the room from the crib/)).toBeOnTheScreen();
    const cap = screen.getByRole('switch', { name: 'Soft volume cap' });
    expect(cap).toBeChecked();
    await fireEvent.press(cap);
    useSettings.getState().setVolume(0.9);
    expect(useSettings.getState().volume).toBe(0.9);
    await fireEvent.press(cap);
    expect(useSettings.getState().volume).toBe(SOFT_VOLUME_CAP);
  });
});

describe('affirmations', () => {
  const shown = () => AFFIRMATIONS.filter((line) => screen.queryByText(line) != null);

  it('shows one kind line on the home screen, and another after a visit elsewhere', async () => {
    await renderApp();
    const [before] = shown();
    expect(shown()).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText('Settings'));
    await fireEvent.press(screen.getByLabelText('Sounds library'));
    await waitFor(() => expect(shown()).toEqual([expect.not.stringMatching(before)]));
  });
});

describe('privacy', () => {
  it('is summed up in Settings, with the full policy a tap away', async () => {
    await renderApp('/settings');
    expect(
      screen.getByText(/does not collect, send or share any personal information/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Read the privacy policy' }));
    expect(await screen.findByText('Microphone and recordings')).toBeOnTheScreen();
    expect(screen.getByText(/Last updated/)).toBeOnTheScreen();
  });
});
