/**
 * Procedural "light chimes" for the gentle wake-up: soft, bell-like notes
 * from a pentatonic scale, struck at a slow, irregular pace.
 *
 * Used at build time by scripts/generate-noise.ts to write
 * assets/sounds/wake/light-chimes.wav. Like the noise loops, it's generated
 * in code, so no licence is needed, and a fixed seed makes it repeatable.
 *
 * Seamless by construction: each note's ringing tail wraps around to the
 * start of the buffer, so the end flows straight into the beginning.
 */
import { createRandom, normalize } from './noise.ts';

export type ChimeOptions = {
  sampleRate: number;
  seconds: number;
  /** Target loudness as RMS, 0..1. Kept soft; the wake-up raises it slowly. */
  targetRms?: number;
  seed?: number;
};

/** C major pentatonic, C5 to E6: no clashing intervals, nothing shrill. */
const NOTES_HZ = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
/** Bell-like partials (ratio to the note, relative level, decay time in seconds). */
const PARTIALS = [
  { ratio: 1, level: 1, decay: 2.2 },
  { ratio: 2.76, level: 0.22, decay: 0.9 },
  { ratio: 5.4, level: 0.06, decay: 0.4 },
];
/** A soft mallet: 15 ms attack, so no strike ever clicks. */
const ATTACK_S = 0.015;
/** How long each note is rendered for (its tail is inaudible by then). */
const RING_S = 6;

export function generateChimesLoop({
  sampleRate,
  seconds,
  targetRms = 0.07,
  seed = 20261101,
}: ChimeOptions): Float32Array {
  const length = Math.round(sampleRate * seconds);
  const out = new Float32Array(length);
  const random = createRandom(seed);

  // Strikes 1.1–2.6 s apart, and never the same note twice in a row.
  let t = 0.2;
  let last = -1;
  while (t < seconds - 0.5) {
    let note = Math.floor(random() * NOTES_HZ.length);
    if (note === last) note = (note + 1 + Math.floor(random() * 3)) % NOTES_HZ.length;
    last = note;
    const velocity = 0.55 + random() * 0.45;
    strike(out, sampleRate, Math.round(t * sampleRate), NOTES_HZ[note], velocity);
    t += 1.1 + random() * 1.5;
  }
  return normalize(out, targetRms);
}

function strike(out: Float32Array, sampleRate: number, at: number, hz: number, velocity: number) {
  const ring = Math.round(RING_S * sampleRate);
  const attack = ATTACK_S * sampleRate;
  for (let i = 0; i < ring; i++) {
    const s = i / sampleRate;
    let v = 0;
    for (const p of PARTIALS) {
      v += p.level * Math.exp(-s / p.decay) * Math.sin(2 * Math.PI * hz * p.ratio * s);
    }
    const env = i < attack ? i / attack : 1;
    // Wrap around the end of the loop so the tail continues at the start.
    out[(at + i) % out.length] += v * env * velocity;
  }
}
