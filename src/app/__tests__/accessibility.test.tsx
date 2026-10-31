import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { useMixes } from '@/store/mixes';
import { useRecordings } from '@/store/recordings';
import { useSafeSleepReminder } from '@/safety/safeSleep';
import { useSettings } from '@/store/settings';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import CreateScreen from '../create';
import PlayerScreen from '../player';
import RecordScreen from '../record';
import PrivacyScreen from '../privacy';
import WelcomeScreen from '../welcome';

/**
 * Accessibility pass (CLAUDE.md §4, §6 step 8): every control on every
 * screen has a name a screen reader can say.
 */
const ROLES = ['button', 'switch', 'radio', 'checkbox', 'adjustable', 'link', 'tab'] as const;

type Node = { props: Record<string, unknown>; children: (Node | string)[] };

function textOf(node: Node | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

function unnamedControls(): string[] {
  return ROLES.flatMap((role) =>
    (screen.queryAllByRole(role) as unknown as Node[])
      .filter(
        (n) => !String(n.props.accessibilityLabel ?? n.props['aria-label'] ?? textOf(n)).trim(),
      )
      .map(() => role),
  );
}

async function renderApp(initialUrl: string) {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
      create: CreateScreen,
      record: RecordScreen,
      welcome: WelcomeScreen,
      privacy: PrivacyScreen,
    },
    { initialUrl },
  );
}

beforeEach(() => {
  // Something in every list: a favorite, a saved mix and a recording.
  useSettings.setState({ favorites: ['rain'] });
  useMixes.setState({
    mixes: [{ id: 'mix-1', name: 'Nap', layers: [{ soundId: 'rain', volume: 0.8 }] }],
  });
  const disk = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;
  disk.set('file:///document/recordings/rec-a11y.m4a', 'audio');
  useRecordings.setState({
    recordings: [
      {
        id: 'rec-a11y',
        name: 'Story',
        icon: 'book',
        color: 'sage',
        fileName: 'rec-a11y.m4a',
        durationMs: 60_000,
        trim: { startMs: 500, endMs: 59_000 },
        trimSilence: true,
        createdAt: 1,
      },
    ],
    filesVersion: 1,
  });
});

afterEach(() => {
  player.stop();
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
  useMixes.setState({ mixes: [] });
  useRecordings.setState({ recordings: [] });
  useSettings.setState({ favorites: [] });
});

describe('every control has a name', () => {
  it.each([
    '/',
    '/my-sounds',
    '/settings',
    '/create',
    '/record',
    '/record?id=rec-a11y',
    '/privacy',
  ])('%s', async (url) => {
    (
      jest.requireMock('expo-audio') as { __permission: { granted: boolean } }
    ).__permission.granted = true;
    await renderApp(url);
    await act(async () => {});
    expect(screen.queryAllByRole('button').length).toBeGreaterThan(0);
    expect(unnamedControls()).toEqual([]);
  });

  it('the welcome', async () => {
    useSettings.setState({ onboarded: false });
    await renderApp('/welcome');
    expect(unnamedControls()).toEqual([]);
  });

  it('the player: reminder, quiet card, mixer, wake-up and dim screen', async () => {
    await renderApp('/');
    await fireEvent.press(screen.getByRole('button', { name: /^Nap, mix of/ }));
    expect(unnamedControls()).toEqual([]);
    await fireEvent.press(await screen.findByRole('button', { name: 'I understand' }));
    useSettings.setState({ wakeUpEnabled: true });
    expect(unnamedControls()).toEqual([]);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now + 60_000);
    await act(async () => jest.advanceTimersByTime(1500));
    expect(screen.getByRole('button', { name: /Screen dimmed/ })).toBeOnTheScreen();
    expect(unnamedControls()).toEqual([]);
    jest.restoreAllMocks();
    await act(async () => router.back());
  });
});
