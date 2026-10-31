/**
 * Procedural white, pink and brown noise with seamless loop points.
 *
 * Used at build time by scripts/generate-noise.ts to write the bundled WAV
 * loops in assets/sounds/noise/. Generating them in code means no licence is
 * needed, and a fixed seed makes every run produce identical files.
 *
 * Keep this file free of imports so Node can run it directly.
 */

export type NoiseColor = 'white' | 'pink' | 'brown';

export type NoiseOptions = {
  color: NoiseColor;
  sampleRate: number;
  seconds: number;
  /** Length of the crossfade that hides the loop point. */
  crossfadeSeconds?: number;
  /** Target loudness as RMS, 0..1. 0.1 is about -20 dBFS: soft by default. */
  targetRms?: number;
  seed?: number;
};

/** Small, fast, seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Raw (un-normalised) noise of the given colour. */
export function rawNoise(color: NoiseColor, length: number, random: () => number): Float32Array {
  const out = new Float32Array(length);
  const white = () => random() * 2 - 1;

  if (color === 'white') {
    for (let i = 0; i < length; i++) out[i] = white();
    return out;
  }

  if (color === 'pink') {
    // Paul Kellet's refined pink filter: -3 dB/octave across the audible range.
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = white();
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
    return out;
  }

  // Brown: leaky integration of white noise (-6 dB/octave). The leak keeps it
  // from drifting into a DC offset or sub-audible rumble.
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * white()) / 1.02;
    out[i] = last;
  }
  return out;
}

/**
 * Makes a buffer loop seamlessly. Takes `loopLength + fade` samples and folds
 * the extra tail over the start with an equal-power crossfade. When the loop
 * wraps from the last sample back to the first, playback continues exactly as
 * the original signal did, so there is no click.
 */
export function makeSeamless(source: Float32Array, loopLength: number): Float32Array {
  const fade = source.length - loopLength;
  if (fade <= 0) throw new Error('source must be longer than loopLength by the crossfade length');
  const out = source.slice(0, loopLength);
  for (let i = 0; i < fade; i++) {
    const t = (i + 0.5) / fade;
    const fadeIn = Math.sin((t * Math.PI) / 2);
    const fadeOut = Math.cos((t * Math.PI) / 2);
    out[i] = source[i] * fadeIn + source[loopLength + i] * fadeOut;
  }
  return out;
}

export function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/** Removes any DC offset, then scales to the target RMS without clipping. */
export function normalize(
  samples: Float32Array,
  targetRms: number,
  peakLimit = 0.95,
): Float32Array {
  let mean = 0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] - mean;

  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const current = rms(out);
  const gain = Math.min(targetRms / current, peakLimit / peak);
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

export function generateNoiseLoop({
  color,
  sampleRate,
  seconds,
  crossfadeSeconds = 2,
  targetRms = 0.1,
  seed = 20261031,
}: NoiseOptions): Float32Array {
  const loopLength = Math.round(sampleRate * seconds);
  const fade = Math.round(sampleRate * crossfadeSeconds);
  // Discard a short warm-up so the filters have settled before the loop starts.
  const warmUp = sampleRate;
  const raw = rawNoise(color, warmUp + loopLength + fade, createRandom(seed));
  const seamless = makeSeamless(raw.subarray(warmUp), loopLength);
  return normalize(seamless, targetRms);
}

/** Encodes mono float samples as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}
