import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { ABOUT_TONES } from '../aboutTones';
import { CATEGORIES, SOUNDS, WAKE_SOUNDS } from '../sounds';

const root = path.resolve(__dirname, '../../..');
const soundsDir = path.join(root, 'assets/sounds');
const licenses = readFileSync(path.join(soundsDir, 'LICENSES.md'), 'utf8');
const HARMONY = SOUNDS.filter((s) => s.category === 'harmony');

describe('Harmony Tones catalogue', () => {
  it('is its own category with the eight sounds from the brief', () => {
    expect(CATEGORIES.map((c) => c.key)).toContain('harmony');
    expect(HARMONY.map((s) => s.id)).toEqual([
      'harmony-174',
      'harmony-396',
      'harmony-528',
      'harmony-639',
      'lullaby-432-musicbox',
      'lullaby-432-piano',
      'bowl-soft',
      'om-drone',
    ]);
  });

  it.each(HARMONY.map((s) => [s.id, s]))(
    '%s has a file, a licence row, a frequency label and a description',
    (_id, sound) => {
      expect(existsSync(path.join(soundsDir, sound.file))).toBe(true);
      expect(licenses).toContain(`\`${sound.file}\``);
      expect(sound.frequencyLabel).toMatch(/^\d+(\.\d+)? Hz$/);
      expect(sound.description?.length).toBeGreaterThan(5);
    },
  );

  it('marks the 432 Hz music as tuned to A432', () => {
    for (const id of ['lullaby-432-musicbox', 'lullaby-432-piano']) {
      expect(HARMONY.find((s) => s.id === id)?.tuning).toBe('A432');
    }
  });

  it('keeps the frequency out of the headline (it is a quiet subtitle)', () => {
    for (const s of HARMONY) expect(s.name).not.toMatch(/Hz/);
  });

  it('is sleep-only: none are wake-up sounds', () => {
    const wake = new Set(WAKE_SOUNDS.map((s) => s.id));
    for (const s of HARMONY) expect(wake.has(s.id)).toBe(false);
  });
});

/**
 * No health or healing claims anywhere people (or app reviewers) can read,
 * or in code comments. Calming, soft and "many people find…" are fine.
 */
const BANNED =
  /\b(heal(s|ed|ing|ers?)?|cure[sd]?|curing|toxins?|detox\w*|dna|therap\w*|chakras?)\b/i;

function files(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === '__tests__' || name === 'node_modules' ? [] : files(full, exts);
    }
    return exts.some((e) => name.endsWith(e)) ? [full] : [];
  });
}

describe('no health claims', () => {
  const checked = [
    ...files(path.join(root, 'src'), ['.ts', '.tsx']),
    ...files(path.join(root, 'scripts'), ['.ts', '.mjs']),
    ...files(path.join(root, 'public'), ['.html', '.webmanifest', '.js']),
    path.join(root, 'app.json'),
    path.join(root, 'docs/store-listing.md'),
    path.join(root, 'docs/privacy-policy.md'),
    path.join(root, 'assets/sounds/LICENSES.md'),
  ];

  it.each(checked.map((f) => [path.relative(root, f), f]))('%s', (_name, file) => {
    const hits = readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => ({ line: i + 1, match: BANNED.exec(line)?.[0] }))
      .filter((h) => h.match);
    expect(hits).toEqual([]);
  });

  it('the About sheet says the evidence plainly', () => {
    const text = ABOUT_TONES.paragraphs.join(' ');
    expect(text).toMatch(/Science hasn’t shown/);
    expect(text).toMatch(/many families find/);
    expect(text).not.toMatch(BANNED);
  });

  it('the check catches the claims it is meant to', () => {
    for (const claim of [
      'heals',
      'Cures colic',
      'removes toxins',
      'repairs DNA',
      'sound therapy',
    ]) {
      expect(claim).toMatch(BANNED);
    }
    for (const fine of ['secure', 'accurate', 'calming', 'soothing', 'Health & Fitness']) {
      expect(fine).not.toMatch(BANNED);
    }
  });
});
