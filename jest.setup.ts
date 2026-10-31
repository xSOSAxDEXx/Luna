// Reanimated 4 runs on react-native-worklets, which has no native side in Jest.
// Together with the resolver in package.json ("react-native-reanimated/jest/resolver"),
// this is the setup Reanimated documents for tests.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();
