import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { player } from '@/audio/player';
import { ABOUT_TONES } from '@/data/aboutTones';
import { useSafeSleepReminder } from '@/safety/safeSleep';
import { PRESET_MIXES, useMixes } from '@/store/mixes';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';
import AboutTonesScreen from '../about-tones';
import CreateScreen from '../create';
import PlayerScreen from '../player';

async function renderApp(initialUrl = '/') {
  await renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
      '(tabs)/my-sounds': MySoundsScreen,
      '(tabs)/settings': SettingsScreen,
      player: PlayerScreen,
      create: CreateScreen,
      'about-tones': AboutTonesScreen,
    },
    { initialUrl },
  );
}

afterEach(() => {
  player.stop();
  useSafeSleepReminder.setState({ acknowledgedSession: 0 });
  useMixes.setState({ mixes: PRESET_MIXES });
});

describe('Harmony Tones in the library', () => {
  it('is a category, with the frequency as a quiet subtitle on each card', async () => {
    await renderApp();
    expect(screen.getByRole('header', { name: 'Harmony Tones' })).toBeOnTheScreen();
    const card = screen.getByRole('button', { name: 'Deep Calm, 174 Hz' });
    expect(within(card).getByText('Deep Calm')).toBeOnTheScreen();
    expect(within(card).getByText('174 Hz')).toBeOnTheScreen();
  });

  it('has an honest "About these tones" sheet', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'About these tones' }));
    expect(await screen.findByRole('header', { name: ABOUT_TONES.title })).toBeOnTheScreen();
    expect(screen.getByText(/Science hasn’t shown/)).toBeOnTheScreen();
    expect(screen.getByText('A deep, grounding hum')).toBeOnTheScreen();
  });

  it('plays like any sound: timer, safe-sleep reminder, and a gentle line about it', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Heart Tone, 528 Hz' }));
    expect(player.getSnapshot()).toMatchObject({ status: 'playing', sound: { id: 'harmony-528' } });
    expect(player.getSnapshot().timer).toMatchObject({ kind: 'countdown' });
    expect(await screen.findByText('Safe sleep reminder')).toBeOnTheScreen();
    expect(
      screen.getByText('528 Hz · The most popular Solfeggio tone, softened'),
    ).toBeOnTheScreen();
  });

  it('shuffles as a category', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Shuffle Harmony Tones sounds' }));
    const program = player.getSnapshot().program;
    expect(program).toMatchObject({ kind: 'shuffle' });
    if (program?.kind === 'shuffle') expect(program.sounds).toHaveLength(8);
  });

  it('can go in a mix', async () => {
    await renderApp('/create');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Singing Bowl' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Rain' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(player.getSnapshot().program).toMatchObject({ kind: 'mix' });
  });

  it('comes with three ready-made mixes that play and can be edited', async () => {
    useMixes.setState({ mixes: PRESET_MIXES });
    await renderApp();
    expect(screen.getByRole('button', { name: 'Edit Ocean + Singing Bowl' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit Brown Noise + 174' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Rain \+ 528, mix of/ }));
    expect(player.getSnapshot().program).toMatchObject({ kind: 'mix', id: 'preset-rain-528' });
  });
});
