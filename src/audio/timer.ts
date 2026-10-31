/**
 * Sleep timer maths. Pure functions over wall-clock timestamps (ms), never a
 * counting interval, so the remaining time stays correct when the app is
 * backgrounded and its JS timers are throttled.
 */

export type SleepTimer =
  | { kind: 'untilStop' }
  | {
      kind: 'countdown';
      /** When the sound should be fully faded out. */
      endsAt: number;
      /** Full length of this countdown including added time; drives the ring. */
      totalMs: number;
      /** Set while paused: the time that was left when the pause began. */
      pausedRemainingMs: number | null;
    };

export const MINUTE = 60_000;
export const DEFAULT_TIMER_MINUTES = 10;
export const QUICK_ADD_MINUTES = [5, 10, 15, 30] as const;

export function countdown(now: number, minutes: number): SleepTimer {
  const ms = minutes * MINUTE;
  return { kind: 'countdown', endsAt: now + ms, totalMs: ms, pausedRemainingMs: null };
}

export const untilStop: SleepTimer = { kind: 'untilStop' };

export function remainingMs(timer: SleepTimer, now: number): number {
  if (timer.kind === 'untilStop') return Infinity;
  if (timer.pausedRemainingMs != null) return timer.pausedRemainingMs;
  return Math.max(0, timer.endsAt - now);
}

export function isExpired(timer: SleepTimer, now: number): boolean {
  return remainingMs(timer, now) <= 0;
}

/**
 * Adds time. From "until I stop" (or an expired timer) the countdown starts
 * fresh from now; otherwise the minutes are added to what's left.
 */
export function addMinutes(timer: SleepTimer, minutes: number, now: number): SleepTimer {
  const ms = minutes * MINUTE;
  if (timer.kind === 'untilStop') return countdown(now, minutes);
  if (isExpired(timer, now)) {
    // Start fresh; if paused, stay paused with the new time waiting.
    const paused = timer.pausedRemainingMs != null;
    return {
      kind: 'countdown',
      endsAt: now + ms,
      totalMs: ms,
      pausedRemainingMs: paused ? ms : null,
    };
  }
  const left = remainingMs(timer, now);
  return {
    kind: 'countdown',
    endsAt: timer.endsAt + ms,
    // Grow the ring's full length so adding time visibly refills it.
    totalMs: Math.max(timer.totalMs, left) + ms,
    pausedRemainingMs: timer.pausedRemainingMs == null ? null : timer.pausedRemainingMs + ms,
  };
}

export function pause(timer: SleepTimer, now: number): SleepTimer {
  if (timer.kind === 'untilStop' || timer.pausedRemainingMs != null) return timer;
  return { ...timer, pausedRemainingMs: remainingMs(timer, now) };
}

export function resume(timer: SleepTimer, now: number): SleepTimer {
  if (timer.kind === 'untilStop' || timer.pausedRemainingMs == null) return timer;
  return { ...timer, endsAt: now + timer.pausedRemainingMs, pausedRemainingMs: null };
}

/** 1 when the ring is full, 0 when time is up. "Until I stop" stays full. */
export function progress(timer: SleepTimer, now: number): number {
  if (timer.kind === 'untilStop') return 1;
  if (timer.totalMs <= 0) return 0;
  return Math.min(1, remainingMs(timer, now) / timer.totalMs);
}

/**
 * Volume multiplier for the end-of-timer fade. The fade fills the last
 * `fadeMs` of the countdown so the sound reaches silence exactly at 0:00.
 * A cubic curve sounds even to the ear (loudness is logarithmic): most of
 * the drop happens early, then it trails off gently.
 */
export function fadeOutGain(remaining: number, fadeMs: number): number {
  if (remaining >= fadeMs) return 1;
  if (remaining <= 0) return 0;
  const t = remaining / fadeMs;
  return t * t * t;
}

/** Volume multiplier for a soft start, `elapsed` ms after play began. */
export function fadeInGain(elapsed: number, fadeMs: number): number {
  if (fadeMs <= 0 || elapsed >= fadeMs) return 1;
  if (elapsed <= 0) return 0;
  const t = elapsed / fadeMs;
  return t * t;
}

/**
 * Calm, minute-level text for the ring. No ticking seconds: a countdown of
 * seconds feels urgent, which is the opposite of what a tired parent needs.
 */
export function formatRemaining(timer: SleepTimer, now: number): string {
  if (timer.kind === 'untilStop') return 'Until you stop';
  const ms = remainingMs(timer, now);
  if (ms <= 0) return 'Sleep well';
  if (ms < MINUTE) return 'Under a minute';
  const minutes = Math.ceil(ms / MINUTE);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
