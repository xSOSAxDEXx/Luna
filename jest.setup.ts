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
// asks of it; tests can inspect `require('expo-audio').__players`, and drive
// the recorder through `__recorder` and `__permission`.
jest.mock('expo-audio', () => {
  const players: Record<string, unknown>[] = [];
  const permission = { granted: false, canAskAgain: true, status: 'undetermined' };
  const recorder = {
    isRecording: false,
    durationMillis: 0,
    metering: undefined as number | undefined,
    uri: null as string | null,
    currentTime: 0,
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    record: jest.fn(() => {
      recorder.isRecording = true;
    }),
    stop: jest.fn(() => {
      recorder.isRecording = false;
      recorder.uri = 'file:///cache/recording-take.m4a';
      return Promise.resolve();
    }),
  };
  const preview = {
    playing: false,
    currentTime: 0,
    play: jest.fn(() => {
      preview.playing = true;
    }),
    pause: jest.fn(() => {
      preview.playing = false;
    }),
    seekTo: jest.fn(() => Promise.resolve()),
  };
  return {
    __players: players,
    __recorder: recorder,
    __preview: preview,
    __permission: permission,
    RecordingPresets: { HIGH_QUALITY: { extension: '.m4a', sampleRate: 44100 } },
    getRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ ...permission })),
    requestRecordingPermissionsAsync: jest.fn(() => {
      permission.granted = true;
      permission.status = 'granted';
      return Promise.resolve({ ...permission });
    }),
    useAudioRecorder: () => recorder,
    useAudioRecorderState: () => ({
      canRecord: true,
      isRecording: recorder.isRecording,
      durationMillis: recorder.durationMillis,
      metering: recorder.metering,
      url: recorder.uri,
    }),
    useAudioPlayer: () => preview,
    useAudioPlayerStatus: () => ({
      playing: preview.playing,
      currentTime: preview.currentTime,
      didJustFinish: false,
    }),
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

// expo-file-system: an in-memory disk. Tests can inspect `__files` (uri → contents).
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  const join = (...parts: unknown[]) =>
    parts
      .map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri))
      .map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, '')))
      .join('/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, '');
    }
    delete() {
      files.delete(this.uri);
    }
    async copy(target: File) {
      files.set(target.uri, files.get(this.uri) ?? `audio:${this.uri}`);
    }
    async write(content: string, options?: { encoding?: string }) {
      files.set(
        this.uri,
        options?.encoding === 'base64' ? Buffer.from(content, 'base64').toString() : content,
      );
    }
    async text() {
      return files.get(this.uri) ?? '';
    }
    async base64() {
      return Buffer.from(files.get(this.uri) ?? '').toString('base64');
    }
    static pickFileAsync = jest.fn(() => Promise.resolve({ canceled: true, result: null }));
  }
  return {
    __files: files,
    File,
    Directory,
    Paths: { document: new Directory('file:///document'), cache: new Directory('file:///cache') },
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Most tests start past the first-launch welcome; the welcome's own tests reset this.
beforeEach(() => {
  require('@/store/settings').useSettings.setState({ onboarded: true });
});
