import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import LibraryScreen from '../(tabs)/index';
import TabsLayout from '../(tabs)/_layout';
import MySoundsScreen from '../(tabs)/my-sounds';
import SettingsScreen from '../(tabs)/settings';

describe('tab navigation', () => {
  it('opens on the sound library with all three tabs available', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': LibraryScreen,
        '(tabs)/my-sounds': MySoundsScreen,
        '(tabs)/settings': SettingsScreen,
      },
      { initialUrl: '/' },
    );

    expect(await screen.findByRole('header', { name: 'Luna Beatzzz' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Sounds library')).toBeOnTheScreen();
    expect(screen.getByLabelText('My Sounds, your recordings')).toBeOnTheScreen();
    expect(screen.getByLabelText('Settings')).toBeOnTheScreen();
  });
});
