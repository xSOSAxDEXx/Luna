import { Linking } from 'react-native';

import { localDay, openQuietSettings, shouldShowQuiet } from '../quietPhone';

const base = {
  setting: 'always' as const,
  sessionId: 3,
  dismissedSession: 0,
  shownSession: 0,
  shownOn: '',
  today: '2026-10-31',
};

describe('shouldShowQuiet', () => {
  it('shows every time by default, until dismissed for that play', () => {
    expect(shouldShowQuiet(base)).toBe(true);
    expect(shouldShowQuiet({ ...base, dismissedSession: 3 })).toBe(false);
    // The next sound shows it again.
    expect(shouldShowQuiet({ ...base, dismissedSession: 3, sessionId: 4 })).toBe(true);
  });

  it('"once a day" shows on the first play of the day only', () => {
    const daily = { ...base, setting: 'daily' as const };
    expect(shouldShowQuiet(daily)).toBe(true);
    // Still showing for the play it first appeared in.
    expect(shouldShowQuiet({ ...daily, shownOn: '2026-10-31', shownSession: 3 })).toBe(true);
    // A later play that day: no.
    expect(shouldShowQuiet({ ...daily, shownOn: '2026-10-31', shownSession: 2 })).toBe(false);
    // Tomorrow: yes again.
    expect(shouldShowQuiet({ ...daily, shownOn: '2026-10-30', shownSession: 2 })).toBe(true);
  });

  it('"never" never shows', () => {
    expect(shouldShowQuiet({ ...base, setting: 'never' })).toBe(false);
  });

  it('uses the local date', () => {
    expect(localDay(new Date(2026, 10, 1, 0, 30))).toBe('2026-11-01');
  });
});

describe('openQuietSettings', () => {
  afterEach(() => jest.restoreAllMocks());

  it('on Android opens Do Not Disturb, or sound settings if that is missing', async () => {
    const sendIntent = jest
      .spyOn(Linking, 'sendIntent')
      .mockRejectedValueOnce(new Error('no activity'))
      .mockResolvedValueOnce(undefined);
    await openQuietSettings('android');
    expect(sendIntent.mock.calls.map((c) => c[0])).toEqual([
      'android.settings.ZEN_MODE_PRIORITY_SETTINGS',
      'android.settings.SOUND_SETTINGS',
    ]);
  });

  it('does nothing on iPhone (apps cannot open Focus settings)', async () => {
    const sendIntent = jest.spyOn(Linking, 'sendIntent');
    sendIntent.mockClear();
    await openQuietSettings('ios');
    expect(sendIntent).not.toHaveBeenCalled();
  });
});
