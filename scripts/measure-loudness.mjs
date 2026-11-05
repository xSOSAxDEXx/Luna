/**
 * Checks that every bundled sound sits at its target loudness, so nothing
 * jumps in volume when a parent switches sounds.
 *
 *   npm run loudness           (all sounds)
 *   npm run loudness -- harmony   (only paths containing "harmony")
 *
 * Needs ffmpeg (its EBU R128 meter). For each WAV it prints:
 * - LUFS: integrated, ear-weighted loudness (the number the targets use);
 * - phone: loudness with everything below ~200 Hz removed, roughly what a
 *   phone speaker can play (low sounds should not fall far below the rest);
 * - peak: the loudest sample, in dBFS.
 * Exits with an error if any sound is more than 1 LU from its target.
 *
 * After changing a synth, run `npm run noise` / `npm run harmony`, then this,
 * and adjust that sound's `rms` in the generator script if it's off.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const soundsDir = path.resolve(import.meta.dirname, '../assets/sounds');

/** Target loudness (LUFS). First match wins; see README "Sounds". */
const TARGETS = [
  [/^noise\/white/, -17], // generated before the targets; bright by nature
  [/^noise\/pink/, -20.7],
  [/^noise\/brown/, -22.2],
  [/^harmony\//, -25],
  [/^music\//, -23],
  [/^wake\/morning-birds/, -22],
  [/^wake\//, -23],
  [/^nature\/crickets/, -23],
  [/^rhythmic\/(heartbeat|womb)/, -21],
  [/./, -21.5],
];
const TOLERANCE = 1;

/** ffmpeg prints its loudness report on stderr. */
function measure(file, filters = '') {
  const run = spawnSync(
    'ffmpeg',
    [
      '-nostats',
      '-hide_banner',
      '-i',
      file,
      '-af',
      `${filters}ebur128=peak=sample`,
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  );
  return run.stderr ?? '';
}

function parse(report, label) {
  const lines = report.split('\n').filter((l) => l.trim().startsWith(`${label}:`));
  return Number(lines.at(-1)?.trim().split(/\s+/)[1]);
}

let ffmpegReady = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  ffmpegReady = false;
}
if (!ffmpegReady) {
  console.error('ffmpeg is needed for this check (e.g. apt-get install ffmpeg).');
  process.exit(2);
}

const only = process.argv[2];
const files = readdirSync(soundsDir, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.wav') && (!only || f.includes(only)))
  .sort();

let off = 0;
console.log(
  `${'sound'.padEnd(36)} ${'LUFS'.padStart(6)} ${'target'.padStart(6)} ${'phone'.padStart(6)} ${'peak'.padStart(6)}`,
);
for (const rel of files) {
  const file = path.join(soundsDir, rel);
  const full = measure(file);
  const phone = measure(file, 'highpass=f=200,highpass=f=200,highpass=f=200,');
  const lufs = parse(full, 'I');
  const peak = parse(full, 'Peak');
  const target = TARGETS.find(([re]) => re.test(rel))[1];
  const ok = Math.abs(lufs - target) <= TOLERANCE;
  if (!ok) off++;
  console.log(
    `${rel.padEnd(36)} ${lufs.toFixed(1).padStart(6)} ${target.toFixed(1).padStart(6)} ${parse(phone, 'I').toFixed(1).padStart(6)} ${peak.toFixed(1).padStart(6)}${ok ? '' : '  ← off target'}`,
  );
}
if (off > 0) {
  console.error(`\n${off} sound(s) more than ${TOLERANCE} LU from target.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} sounds within ${TOLERANCE} LU of their targets.`);
