import { create } from 'zustand';

/**
 * Safe-sleep guidance shown every time a sound starts, and always available
 * in Settings. One source so the two never drift apart.
 *
 * This reminder is deliberately not optional: it can be acknowledged for
 * each play, but there is no setting to turn it off.
 */
export const SAFE_SLEEP = {
  title: 'Safe sleep reminder',
  points: [
    'Keep your phone across the room, well out of your baby’s reach. Never place it in or on the crib, bassinet or bed.',
    'Never leave a phone or charger plugged in near your baby. Cords are a strangulation risk, and charging phones can get hot.',
    'Keep the volume soft.',
  ],
  acknowledge: 'I understand',
} as const;

type State = {
  /** The playback session whose reminder was acknowledged. */
  acknowledgedSession: number;
  acknowledge: (sessionId: number) => void;
};

/** Not persisted: the reminder returns every time a sound is started. */
export const useSafeSleepReminder = create<State>()((set) => ({
  acknowledgedSession: 0,
  acknowledge: (sessionId) => set({ acknowledgedSession: sessionId }),
}));
