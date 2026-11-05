/**
 * Writes every bundled sound: the white, pink and brown noise loops, the
 * wake-up sounds, and the nature, rhythmic and music loops, all synthesised
 * in code (src/audio/noise.ts, chimes.ts, soundscapes.ts, music.ts).
 *
 *   npm run noise            (all of them)
 *   npm run noise -- rain    (only the synthesised sounds whose file matches)
 *
 * The output is deterministic (fixed seed) and committed, so builds never
 * need to run this. Re-run it after changing any of the files above.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generateChimesLoop } from '../src/audio/chimes.ts';
import {
  lullaby,
  morningBirds,
  musicBox,
  PIECES,
  piano,
  harp,
  playful,
} from '../src/audio/music.ts';
import { encodeWav, generateNoiseLoop, type NoiseColor, normalize } from '../src/audio/noise.ts';
import * as scapes from '../src/audio/soundscapes.ts';
import { createRandom, type Random } from '../src/audio/synth.ts';

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

// Wake-up: light chimes. 22.05 kHz is plenty for notes up to ~7 kHz partials.
const CHIMES_RATE = 22_050;
const CHIMES_SECONDS = 24;
const wakeDir = path.resolve(import.meta.dirname, '../assets/sounds/wake');
await mkdir(wakeDir, { recursive: true });
const chimesFile = path.join(wakeDir, 'light-chimes.wav');
await writeFile(
  chimesFile,
  encodeWav(generateChimesLoop({ sampleRate: CHIMES_RATE, seconds: CHIMES_SECONDS }), CHIMES_RATE),
);
console.log(`wrote ${path.relative(process.cwd(), chimesFile)}`);

// Everything else: nature, rhythmic and music sounds and the other wake-up
// sounds (src/audio/soundscapes.ts and music.ts). Each has its own seed, so
// changing one never changes the others. `rms` sets how loud each is; they're
// balanced by ear-weighted loudness (ffmpeg ebur128) against the pink noise.
type Synth = {
  file: string;
  sampleRate: number;
  seconds: number;
  rms: number;
  render: (fs: number, n: number, random: Random) => Float32Array;
};
const SYNTHS: Synth[] = [
  { file: 'nature/rain.wav', sampleRate: 22_050, seconds: 16, rms: 0.072, render: scapes.rain },
  {
    file: 'nature/ocean-waves.wav',
    sampleRate: 22_050,
    seconds: 30,
    rms: 0.128,
    render: scapes.ocean,
  },
  { file: 'nature/stream.wav', sampleRate: 22_050, seconds: 16, rms: 0.069, render: scapes.stream },
  { file: 'nature/wind.wav', sampleRate: 22_050, seconds: 24, rms: 0.1, render: scapes.wind },
  {
    file: 'nature/forest-night.wav',
    sampleRate: 22_050,
    seconds: 24,
    rms: 0.099,
    render: scapes.forestNight,
  },
  {
    file: 'nature/crickets.wav',
    sampleRate: 22_050,
    seconds: 12,
    rms: 0.048,
    render: scapes.crickets,
  },
  {
    file: 'rhythmic/heartbeat.wav',
    sampleRate: 16_000,
    seconds: 15,
    rms: 0.147,
    render: scapes.heartbeat,
  },
  { file: 'rhythmic/womb.wav', sampleRate: 16_000, seconds: 15, rms: 0.155, render: scapes.womb },
  {
    file: 'rhythmic/shushing.wav',
    sampleRate: 22_050,
    seconds: 20,
    rms: 0.055,
    render: scapes.shushing,
  },
  { file: 'rhythmic/fan.wav', sampleRate: 22_050, seconds: 12, rms: 0.121, render: scapes.fan },
  {
    file: 'rhythmic/car-ride.wav',
    sampleRate: 16_000,
    seconds: 24,
    rms: 0.111,
    render: scapes.carRide,
  },
  { file: 'rhythmic/train.wav', sampleRate: 16_000, seconds: 16, rms: 0.111, render: scapes.train },
  {
    file: 'music/lullaby.wav',
    sampleRate: 22_050,
    seconds: PIECES.lullaby.seconds,
    rms: 0.077,
    render: lullaby,
  },
  {
    file: 'music/music-box.wav',
    sampleRate: 22_050,
    seconds: PIECES.musicBox.seconds,
    rms: 0.075,
    render: musicBox,
  },
  {
    file: 'music/piano.wav',
    sampleRate: 22_050,
    seconds: PIECES.piano.seconds,
    rms: 0.078,
    render: piano,
  },
  {
    file: 'music/harp.wav',
    sampleRate: 22_050,
    seconds: PIECES.harp.seconds,
    rms: 0.079,
    render: harp,
  },
  {
    file: 'wake/morning-birds.wav',
    sampleRate: 22_050,
    seconds: 20,
    rms: 0.039,
    render: morningBirds,
  },
  {
    file: 'wake/playful-melody.wav',
    sampleRate: 22_050,
    seconds: PIECES.playful.seconds,
    rms: 0.075,
    render: playful,
  },
];

const only = process.argv[2];
const soundsDir = path.resolve(import.meta.dirname, '../assets/sounds');
for (const [index, synth] of SYNTHS.entries()) {
  if (only && !synth.file.includes(only)) continue;
  const n = Math.round(synth.sampleRate * synth.seconds);
  const raw = synth.render(synth.sampleRate, n, createRandom(1000 + index));
  const samples = normalize(raw, synth.rms, 0.9);
  const file = path.join(soundsDir, synth.file);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, encodeWav(samples, synth.sampleRate));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
