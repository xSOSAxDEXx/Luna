/**
 * Writes the Harmony Tones loops (src/audio/harmony.ts) to
 * assets/sounds/harmony/.
 *
 *   npm run harmony            (all of them)
 *   npm run harmony -- 528     (only files whose name matches)
 *
 * Deterministic (fixed seeds) and committed, so builds never need to run
 * this. Levels sit a little under the music in the library (about −25 LUFS,
 * checked with ffmpeg's EBU R128 meter): steady tones feel louder than their
 * measured level, so a touch quieter keeps them gentle.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BOWL_SECONDS,
  HARMONY_SECONDS,
  harmony174,
  harmony396,
  harmony528,
  harmony639,
  omDrone,
  singingBowl,
} from '../src/audio/harmony.ts';
import { musicBox432, PIECES_432, slowPiano432 } from '../src/audio/music.ts';
import { encodeWav, normalize } from '../src/audio/noise.ts';
import { createRandom, type Random } from '../src/audio/synth.ts';

const SAMPLE_RATE = 22_050;

type Tone = {
  file: string;
  rms: number;
  seed: number;
  seconds?: number;
  render: (fs: number, n: number, random: Random) => Float32Array;
};

const TONES: Tone[] = [
  { file: 'harmony-174.wav', rms: 0.063, seed: 174, render: harmony174 },
  { file: 'harmony-396.wav', rms: 0.061, seed: 396, render: harmony396 },
  { file: 'harmony-528.wav', rms: 0.06, seed: 528, render: harmony528 },
  { file: 'harmony-639.wav', rms: 0.059, seed: 639, render: harmony639 },
  { file: 'bowl-soft.wav', rms: 0.062, seed: 216, seconds: BOWL_SECONDS, render: singingBowl },
  {
    file: 'lullaby-432-musicbox.wav',
    rms: 0.06,
    seed: 432,
    seconds: PIECES_432.musicBox.seconds,
    render: (fs, n) => musicBox432(fs, n),
  },
  {
    file: 'lullaby-432-piano.wav',
    rms: 0.062,
    seed: 433,
    seconds: PIECES_432.piano.seconds,
    render: (fs, n) => slowPiano432(fs, n),
  },
  { file: 'om-drone.wav', rms: 0.064, seed: 1361, render: omDrone },
];

const only = process.argv[2];
const outDir = path.resolve(import.meta.dirname, '../assets/sounds/harmony');
await mkdir(outDir, { recursive: true });
for (const tone of TONES) {
  if (only && !tone.file.includes(only)) continue;
  const n = Math.round(SAMPLE_RATE * (tone.seconds ?? HARMONY_SECONDS));
  const samples = normalize(tone.render(SAMPLE_RATE, n, createRandom(tone.seed)), tone.rms, 0.9);
  const file = path.join(outDir, tone.file);
  await writeFile(file, encodeWav(samples, SAMPLE_RATE));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
