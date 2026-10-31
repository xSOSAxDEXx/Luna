/**
 * Small, kind lines for the home screen (CLAUDE.md §4). Reassuring, never
 * guilt or pressure. One shows at a time and changes each time the library
 * is opened.
 */
export const AFFIRMATIONS = [
  'One breath at a time.',
  'You’re doing great.',
  'Rest is on its way.',
  'Slow and soft. You’ve got this.',
  'This moment is enough.',
  'Gentle sounds, gentle night.',
  'You’re exactly what they need.',
  'Breathe in, breathe out.',
] as const;

/** The next affirmation, never the same one twice in a row. */
export function nextAffirmation(previous: number, random: () => number = Math.random): number {
  if (AFFIRMATIONS.length < 2) return 0;
  const step = 1 + Math.floor(random() * (AFFIRMATIONS.length - 1));
  return (previous + step) % AFFIRMATIONS.length;
}
