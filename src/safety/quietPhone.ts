import { Linking, Platform } from 'react-native';
import { create } from 'zustand';

import type { QuietReminder } from '@/store/settings';

/** The "quiet your phone" card (CLAUDE.md §3.7). */
export const QUIET_PHONE = {
  title: 'Before you settle in',
  body: 'Silence your phone and turn off vibration so nothing disturbs the little one.',
  /** iPhones don't let apps open Focus settings, so there's a pointer instead. */
  iosHint: 'Swipe down from the top-right corner and tap Focus, then Do Not Disturb.',
  button: 'Open Do Not Disturb',
} as const;

/** "2026-10-31" in local time, for "once a day". */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Whether the card shows for this play session:
 * - "always": every time a sound starts, until dismissed.
 * - "daily": the first time a sound starts each day (and for the rest of
 *   that play, until dismissed).
 * - "never": not at all.
 */
export function shouldShowQuiet(args: {
  setting: QuietReminder;
  sessionId: number;
  /** The session this card was dismissed in. */
  dismissedSession: number;
  /** The session it was first shown in today ("daily"). */
  shownSession: number;
  /** The local day it was last shown on. */
  shownOn: string;
  today: string;
}): boolean {
  const { setting, sessionId, dismissedSession, shownSession, shownOn, today } = args;
  if (setting === 'never' || sessionId === 0 || dismissedSession === sessionId) return false;
  if (setting === 'daily') return shownOn !== today || shownSession === sessionId;
  return true;
}

type State = {
  dismissedSession: number;
  shownSession: number;
  dismiss: (sessionId: number) => void;
  markShown: (sessionId: number) => void;
};

/** Per-play state; not persisted (the "once a day" date lives in settings). */
export const useQuietPhone = create<State>()((set) => ({
  dismissedSession: 0,
  shownSession: 0,
  dismiss: (sessionId) => set({ dismissedSession: sessionId }),
  markShown: (sessionId) => set({ shownSession: sessionId }),
}));

/** Android can open Do Not Disturb (or sound settings); iPhone and the web can't. */
export const CAN_OPEN_QUIET_SETTINGS = Platform.OS === 'android';

/** Opens Do Not Disturb settings, falling back to sound settings, then the app's settings. */
export async function openQuietSettings(os: string = Platform.OS): Promise<void> {
  if (os !== 'android') return;
  for (const action of [
    'android.settings.ZEN_MODE_PRIORITY_SETTINGS',
    'android.settings.SOUND_SETTINGS',
  ]) {
    try {
      await Linking.sendIntent(action);
      return;
    } catch {
      // Not on this phone; try the next one.
    }
  }
  await Linking.openSettings().catch(() => {});
}
