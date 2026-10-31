/**
 * Writes docs/privacy-policy.md and public/privacy.html from
 * src/legal/privacy.ts, so the app, the docs and the web page always say
 * the same thing.
 *
 *   npm run privacy
 *
 * A test fails if these files are out of date.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { privacyHtml, privacyMarkdown } from '../src/legal/privacy.ts';

const root = path.resolve(import.meta.dirname, '..');
await writeFile(path.join(root, 'docs/privacy-policy.md'), privacyMarkdown());
await writeFile(path.join(root, 'public/privacy.html'), privacyHtml());
console.log('Wrote docs/privacy-policy.md and public/privacy.html');
