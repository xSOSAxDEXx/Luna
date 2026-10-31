import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { CATEGORIES, SOUNDS } from '../sounds';

const soundsDir = path.resolve(__dirname, '../../../assets/sounds');
const licenses = readFileSync(path.join(soundsDir, 'LICENSES.md'), 'utf8');

describe('sound catalogue', () => {
  it('has unique ids', () => {
    const ids = SOUNDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category from the brief', () => {
    for (const { key } of CATEGORIES) {
      expect(SOUNDS.some((s) => s.category === key)).toBe(true);
    }
  });

  it.each(SOUNDS.map((s) => [s.id, s]))('%s points at a file that exists', (_id, sound) => {
    expect(existsSync(path.join(soundsDir, sound.file))).toBe(true);
  });

  it.each(SOUNDS.filter((s) => !s.placeholder).map((s) => [s.id, s]))(
    '%s has a licence entry',
    (_id, sound) => {
      expect(licenses).toContain(`\`${sound.file}\``);
    },
  );

  it('lists every placeholder sound as still to source', () => {
    const todo = licenses.slice(licenses.indexOf('## Still to source')).toLowerCase();
    for (const sound of SOUNDS.filter((s) => s.placeholder)) {
      const word = sound.name.toLowerCase().replace(/^(soft|gentle) /, '');
      expect({ sound: sound.id, listed: todo.includes(word) }).toEqual({
        sound: sound.id,
        listed: true,
      });
    }
  });
});
