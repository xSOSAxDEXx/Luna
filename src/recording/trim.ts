/**
 * Light trim of silence at the start and end of a recording (CLAUDE.md §3.6).
 *
 * The recording itself is never cut. While recording, the recorder reports a
 * loudness level (dBFS) several times a second; from those levels we find
 * where the voice starts and ends, and the player loops only that part.
 * Keeping the original file means the trim can be switched off at any time.
 */

/** One loudness reading: how far into the recording, and how loud (dBFS, 0 = max). */
export type LevelSample = { atMs: number; db: number };

/** The part of a recording to play, in milliseconds from the start of the file. */
export type TrimRange = { startMs: number; endMs: number };

/** Readings quieter than this are always silence (a quiet room is around −50 to −60). */
const SILENCE_FLOOR_DB = -45;
/** Below the loudest reading by more than this counts as silence too. */
const BELOW_PEAK_DB = 30;
/** Leave a little room before the first sound so a soft breath-in isn't clipped. */
export const LEAD_PAD_MS = 250;
/** And a little after the last sound, so a held note can ring out. */
export const TAIL_PAD_MS = 600;
/** Not worth trimming less than this in total. */
const MIN_SAVING_MS = 500;
/** Never leave a trimmed recording shorter than this. */
const MIN_LENGTH_MS = 1_000;

/**
 * Where the sound starts and ends, or null if there's nothing worth
 * trimming (or no levels were recorded, e.g. a browser without metering).
 */
export function findTrim(levels: LevelSample[], durationMs: number): TrimRange | null {
  const usable = levels.filter((l) => Number.isFinite(l.db) && l.atMs >= 0);
  if (usable.length < 3 || durationMs <= MIN_LENGTH_MS) return null;

  const peak = Math.max(...usable.map((l) => l.db));
  const threshold = Math.max(SILENCE_FLOOR_DB, peak - BELOW_PEAK_DB);
  // A recording that's all quiet: leave it alone rather than guess.
  if (peak < SILENCE_FLOOR_DB) return null;

  const loud = usable.filter((l) => l.db >= threshold);
  const first = loud[0].atMs;
  const last = loud[loud.length - 1].atMs;

  const startMs = Math.max(0, first - LEAD_PAD_MS);
  const endMs = Math.min(durationMs, last + TAIL_PAD_MS);
  if (endMs - startMs < MIN_LENGTH_MS) return null;
  if (startMs + (durationMs - endMs) < MIN_SAVING_MS) return null;
  return { startMs: Math.round(startMs), endMs: Math.round(endMs) };
}

/**
 * While a trimmed recording loops: where to jump to (in ms), or null to carry
 * on. Called on each playback status update (every few hundred ms, including
 * with the screen off). Past the end of the voice, or before its start
 * (the file looped back to 0 by itself), jump to the start.
 */
export function loopRangeSeek(positionMs: number, range: TrimRange): number | null {
  if (positionMs >= range.endMs || positionMs < range.startMs - 50) return range.startMs;
  return null;
}
