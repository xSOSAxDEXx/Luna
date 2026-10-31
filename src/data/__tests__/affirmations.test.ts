import { AFFIRMATIONS, nextAffirmation } from '../affirmations';

describe('affirmations', () => {
  it('never shows the same one twice in a row', () => {
    for (let prev = 0; prev < AFFIRMATIONS.length; prev++) {
      for (const r of [0, 0.3, 0.5, 0.99]) {
        const next = nextAffirmation(prev, () => r);
        expect(next).not.toBe(prev);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(AFFIRMATIONS.length);
      }
    }
  });

  it('stays kind: no guilt, streaks or pressure words', () => {
    for (const line of AFFIRMATIONS) {
      expect(line).not.toMatch(/should|must|streak|fail|don't|again\b/i);
    }
  });
});
