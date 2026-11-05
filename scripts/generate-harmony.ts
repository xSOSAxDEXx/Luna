/**
 * Writes the Harmony Tones loops (src/audio/harmony.ts) to
 * assets/sounds/harmony/.
 *
 *   npm run harmony            (all of them)
 *   npm run harmony -- 528     (only files whose name matches)
 *
 * Deterministic (fixed seeds) and committed, so builds never need to run
 * this. Levels match the music in the library (about −23 LUFS, checked with
 * ffmpeg's EBU R128 meter), so nothing jumps in volume when switching.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  HARMONY_SECONDS,
  harmony174,
  harmony396,
  harmony528,
  harmony639,
  omDrone,
} from '../src/audio/harmony.ts';
import { encodeWav, normalize } from '../src/audio/noise.ts';
import { createRandom, type Random } from '../src/audio/synth.ts';

const SAMPLE_RATE = 22_050;

type Tone = {
  file: string;
  rms: number;
  seed: number;
  render: (fs: number, n: number, random: Random) => Float32Array;
};

const TONES: Tone[] = [
  { file: 'harmony-174.wav', rms: 0.079, seed: 174, render: harmony174 },
  { file: 'harmony-396.wav', rms: 0.076, seed: 396, render: harmony396 },
  { file: 'harmony-528.wav', rms: 0.076, seed: 528, render: harmony528 },
  { file: 'harmony-639.wav', rms: 0.074, seed: 639, render: harmony639 },
  { file: 'om-drone.wav', rms: 0.079, seed: 1361, render: omDrone },
];

const only = process.argv[2];
const outDir = path.resolve(import.meta.dirname, '../assets/sounds/harmony');
await mkdir(outDir, { recursive: true });
for (const tone of TONES) {
  if (only && !tone.file.includes(only)) continue;
  const n = SAMPLE_RATE * HARMONY_SECONDS;
  const samples = normalize(tone.render(SAMPLE_RATE, n, createRandom(tone.seed)), tone.rms, 0.9);
  const file = path.join(outDir, tone.file);
  await writeFile(file, encodeWav(samples, SAMPLE_RATE));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
