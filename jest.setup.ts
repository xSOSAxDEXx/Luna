// Reanimated 4 runs on react-native-worklets, which has no native side in Jest.
// Together with the resolver in package.json ("react-native-reanimated/jest/resolver"),
// this is the setup Reanimated documents for tests.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();

// In-memory AsyncStorage, as documented by the library.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-audio has no native module under Jest. This fake records what the app
// asks of it; tests can inspect `require('expo-audio').__players`.
jest.mock('expo-audio', () => {
  const players: Record<string, unknown>[] = [];
  return {
    __players: players,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn((source: unknown) => {
      const p = {
        source,
        loop: false,
        volume: 1,
        playing: false,
        removed: false,
        play: jest.fn(() => {
          p.playing = true;
        }),
        pause: jest.fn(() => {
          p.playing = false;
        }),
        remove: jest.fn(() => {
          p.removed = true;
        }),
        setActiveForLockScreen: jest.fn(),
        updateLockScreenMetadata: jest.fn(),
        clearLockScreenControls: jest.fn(),
        listeners: [] as unknown[],
        addListener: jest.fn((_event: string, fn: unknown) => {
          p.listeners.push(fn);
          return { remove: () => p.listeners.splice(p.listeners.indexOf(fn), 1) };
        }),
      };
      players.push(p);
      return p;
    }),
  };
});
