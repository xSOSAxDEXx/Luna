/**
 * Writes the seamless white, pink and brown noise loops bundled with the app,
 * plus the shared placeholder used by sounds that haven't been sourced yet.
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

// Placeholder: quieter pink noise with a slow swell, so it's easy to tell
// apart from the real noise sounds while testing. Small (16 kHz, 8 s) because
// every unsourced sound shares it. The swell completes exactly one cycle per
// loop, so the loop point stays seamless.
const PLACEHOLDER_RATE = 16_000;
const PLACEHOLDER_SECONDS = 8;
const placeholder = generateNoiseLoop({
  color: 'pink',
  sampleRate: PLACEHOLDER_RATE,
  seconds: PLACEHOLDER_SECONDS,
  crossfadeSeconds: 1,
  targetRms: 0.06,
  seed: 7,
});
for (let i = 0; i < placeholder.length; i++) {
  const phase = (i / placeholder.length) * 2 * Math.PI;
  placeholder[i] *= 0.7 - 0.3 * Math.cos(phase);
}
const placeholderDir = path.resolve(import.meta.dirname, '../assets/sounds/placeholder');
await mkdir(placeholderDir, { recursive: true });
const placeholderFile = path.join(placeholderDir, 'PLACEHOLDER.wav');
await writeFile(placeholderFile, encodeWav(placeholder, PLACEHOLDER_RATE));
console.log(`wrote ${path.relative(process.cwd(), placeholderFile)}`);
