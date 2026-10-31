#!/usr/bin/env node
/**
 * Runs after `expo export --platform web` (see `npm run build:web`).
 * Fills the service worker's precache list with every file in the export
 * (JS, fonts, images and all sounds) and stamps it with a content hash, so
 * the installed web app works offline and updates cleanly when files change.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const SKIP = new Set(['sw.js', 'metadata.json']);

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = (await walk(dist))
  .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/'))
  .filter((f) => !SKIP.has(f.slice(1)) && !f.endsWith('.map'))
  .map((f) => (f === '/index.html' ? '/' : f))
  .sort();

const hash = createHash('sha256');
for (const f of files) {
  hash.update(f);
  hash.update(await readFile(path.join(dist, f === '/' ? 'index.html' : f.slice(1))));
}
const version = hash.digest('hex').slice(0, 12);

const swPath = path.join(dist, 'sw.js');
let sw = await readFile(swPath, 'utf8');
if (!sw.includes('__LUNA_VERSION__') || !sw.includes('/* __LUNA_PRECACHE__ */ []')) {
  throw new Error('dist/sw.js is missing its build placeholders');
}
sw = sw
  .replace('__LUNA_VERSION__', version)
  .replace('/* __LUNA_PRECACHE__ */ []', JSON.stringify(files, null, 2));
await writeFile(swPath, sw);

const sounds = files.filter((f) => /\.(wav|mp3|m4a|ogg)$/.test(f)).length;
console.log(`service worker: version ${version}, ${files.length} files (${sounds} sounds)`);
