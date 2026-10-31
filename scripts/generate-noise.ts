/**
 * Writes the seamless white, pink and brown noise loops bundled with the app.
 *
 *   npm run noise
 *
 * The output is deterministic (fixed seed) and committed, so builds never
 * need to run this. Re-run it only after changing src/audio/noise.ts.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { encodeWav, generateNoiseLoop, type NoiseColor } from '../src/audio/noise.ts';

const SAMPLE_RATE = 32_000; // plenty for broadband noise; keeps files small
const SECONDS = 30; // long enough that the repeat is not noticeable

const outDir = path.resolve(import.meta.dirname, '../assets/sounds/noise');
await mkdir(outDir, { recursive: true });

const colors: NoiseColor[] = ['white', 'pink', 'brown'];
for (const color of colors) {
  const samples = generateNoiseLoop({ color, sampleRate: SAMPLE_RATE, seconds: SECONDS });
  const file = path.join(outDir, `${color}-noise.wav`);
  await writeFile(file, encodeWav(samples, SAMPLE_RATE));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
