/**
 * Nature and rhythmic sounds, synthesised in code (see synth.ts for how the
 * loops stay seamless). Each is soft, has no sudden or sharp moments, and
 * keeps some energy above ~150 Hz so it can be heard on a phone speaker.
 *
 * Generated at build time by scripts/generate-noise.ts into
 * assets/sounds/<category>/<id>.wav. Original work: no licence needed.
 */
import {
  addEvent,
  bandpass,
  brownNoise,
  fadeIn,
  highpass,
  lowpass,
  mix,
  multiply,
  pinkNoise,
  type Random,
  TAU,
  wander,
  whiteNoise,
} from './synth.ts';

type Render = (sampleRate: number, length: number, random: Random) => Float32Array;

// ---- Nature ----

/** Steady rain: a soft hiss of distant rain with many tiny nearby drops. */
export const rain: Render = (fs, n, random) => {
  const hiss = lowpass(highpass(pinkNoise(n, random), fs, 300), fs, 5500, 2);
  const flutter = wander(n, (n / fs) * 0.6, random);
  const bed = multiply(hiss, (i) => 0.85 + 0.3 * flutter[i]);

  const drops = new Float32Array(n);
  const count = Math.round((n / fs) * 140);
  for (let d = 0; d < count; d++) {
    const near = random() < 0.06;
    const f = near ? 900 + random() * 1200 : 1800 + random() * 3200;
    const decay = (near ? 0.014 : 0.004 + random() * 0.004) * fs;
    const amp = (near ? 0.22 : 0.12) * (0.3 + random() ** 2);
    const len = Math.round(decay * 6);
    const attack = Math.round(0.0015 * fs);
    addEvent(drops, random() * n, len, (k) => {
      return amp * fadeIn(k, attack) * Math.exp(-k / decay) * Math.sin((TAU * f * k) / fs);
    });
  }
  return mix([bed, 1], [lowpass(drops, fs, 5000), 0.7]);
};

/**
 * Ocean waves: three slow waves per loop (about 10 s each) that swell,
 * break softly and draw back with a gentle fizz.
 */
export const ocean: Render = (fs, n, random) => {
  const waveSeconds = [9.5, 10.5, 10];
  const total = waveSeconds.reduce((a, b) => a + b, 0);
  const env = new Float32Array(n);
  const recede = new Float32Array(n);
  let start = 0;
  for (const w of waveSeconds) {
    const len = Math.round((w / total) * n);
    for (let k = 0; k < len && start + k < n; k++) {
      const p = k / len;
      const shape =
        p < 0.55 ? Math.sin((Math.PI / 2) * (p / 0.55)) ** 2 : (1 - (p - 0.55) / 0.45) ** 2;
      env[start + k] = 0.3 + 0.7 * shape;
      recede[start + k] = p > 0.5 ? Math.sin(Math.PI * ((p - 0.5) / 0.5)) : 0;
    }
    start += len;
  }
  for (let i = start; i < n; i++) env[i] = 0.3; // rounding remainder
  // The crest is a little smoother than the raw shape.
  const smoothEnv = lowpass(env, fs, 0.6);
  const body = pinkNoise(n, random);
  const cutoff = new Float32Array(n);
  for (let i = 0; i < n; i++) cutoff[i] = 380 + 2600 * smoothEnv[i] ** 1.5;
  const swell = multiply(lowpass(body, fs, cutoff, 2), (i) => smoothEnv[i]);
  const fizz = multiply(highpass(pinkNoise(n, random), fs, 1800), (i) => 0.35 * recede[i]);
  const deep = multiply(lowpass(brownNoise(n, random), fs, 260), (i) => 0.4 + 0.6 * smoothEnv[i]);
  return mix([swell, 1], [fizz, 1], [deep, 0.3]);
};

/** A small stream: babbling water with soft bubbles. */
export const stream: Render = (fs, n, random) => {
  const seconds = n / fs;
  const a = bandpass(whiteNoise(n, random), fs, 1100, 0.8);
  const b = bandpass(whiteNoise(n, random), fs, 2600, 1.2);
  const flutterA = wander(n, seconds * 11, random);
  const flutterB = wander(n, seconds * 17, random);
  const water = mix(
    [multiply(a, (i) => 0.35 + 0.65 * flutterA[i] ** 2), 1],
    [multiply(b, (i) => 0.25 + 0.75 * flutterB[i] ** 2), 0.5],
  );

  const bubbles = new Float32Array(n);
  const count = Math.round(seconds * 22);
  for (let d = 0; d < count; d++) {
    const f0 = 380 + random() * 900;
    const dur = (0.015 + random() * 0.03) * fs;
    const amp = 0.25 + random() * 0.5;
    let phase = 0;
    addEvent(bubbles, random() * n, Math.round(dur), (k) => {
      const t = k / dur;
      phase += (TAU * f0 * (1 + 0.7 * t)) / fs;
      return amp * Math.sin(Math.PI * t) ** 2 * Math.sin(phase);
    });
  }
  return mix([water, 1], [bubbles, 0.12], [lowpass(pinkNoise(n, random), fs, 500), 0.3]);
};

/** Wind: soft gusts rising and falling, never howling. */
export const wind: Render = (fs, n, random) => {
  const gust = lowpass(wander(n, (n / fs) * 0.35, random), fs, 0.5);
  const center = new Float32Array(n);
  for (let i = 0; i < n; i++) center[i] = 260 + 650 * gust[i];
  const air = bandpass(pinkNoise(n, random), fs, center, 0.9);
  const body = lowpass(brownNoise(n, random), fs, 300);
  return mix([multiply(air, (i) => 0.35 + 0.75 * gust[i]), 1], [body, 0.35]);
};

/** Crickets: several at different distances, each chirping in its own rhythm. */
function cricketLayer(fs: number, n: number, random: Random, count: number): Float32Array {
  const out = new Float32Array(n);
  const seconds = n / fs;
  for (let c = 0; c < count; c++) {
    const carrier = 3600 + random() * 1300;
    const chirps = Math.max(1, Math.round(seconds / (0.42 + random() * 0.35)));
    const period = n / chirps;
    const amp = 0.25 + random() * 0.75;
    const pulses = 2 + Math.floor(random() * 3);
    const offset = random() * period;
    const drift = wander(n, seconds * 0.3, random);
    const pulseLen = Math.round(0.016 * fs);
    const gap = Math.round(0.034 * fs);
    for (let k = 0; k < chirps; k++) {
      const start = offset + k * period + (random() - 0.5) * 0.04 * fs;
      for (let p = 0; p < pulses; p++) {
        const at = Math.round(start + p * gap);
        const level = amp * (0.4 + 0.6 * drift[((at % n) + n) % n]);
        addEvent(out, at, pulseLen, (j) => {
          const env = Math.sin((Math.PI * j) / pulseLen) ** 2;
          return level * env * Math.sin((TAU * carrier * j) / fs);
        });
      }
    }
  }
  return out;
}

export const crickets: Render = (fs, n, random) => {
  const chorus = cricketLayer(fs, n, random, 6);
  const air = lowpass(highpass(pinkNoise(n, random), fs, 1500), fs, 4000);
  // A gentle low-pass keeps the chirps from sounding sharp.
  return mix([lowpass(chorus, fs, 5200), 1], [air, 0.25]);
};

/** Forest at night: a soft breeze, distant crickets and, now and then, a far-off owl. */
export const forestNight: Render = (fs, n, random) => {
  const seconds = n / fs;
  const breeze = wind(fs, n, random);
  const far = lowpass(cricketLayer(fs, n, random, 4), fs, 3500);

  const owl = new Float32Array(n);
  // "Hoo … hoo-hoo", once per loop, soft and low.
  const hoots: [number, number][] = [
    [0, 0.42],
    [0.75, 0.22],
    [1.05, 0.38],
  ];
  const owlAt = random() * seconds;
  for (const [offset, dur] of hoots) {
    const len = Math.round(dur * fs);
    const attack = Math.round(0.08 * fs);
    const release = Math.round(0.14 * fs);
    let phase = 0;
    addEvent(owl, (owlAt + offset) * fs, len, (k) => {
      const f = 340 - 25 * (k / len) + 4 * Math.sin((TAU * 5 * k) / fs);
      phase += (TAU * f) / fs;
      const env = fadeIn(k, attack) * (k > len - release ? fadeIn(len - k, release) : 1);
      return env * (Math.sin(phase) + 0.25 * Math.sin(2 * phase));
    });
  }

  // Leaves rustling: a few soft swells of filtered noise.
  const rustleCurve = new Float32Array(n);
  for (let r = 0; r < Math.round(seconds / 6); r++) {
    const len = Math.round((0.6 + random() * 0.8) * fs);
    addEvent(rustleCurve, random() * n, len, (k) => Math.sin((Math.PI * k) / len) ** 2);
  }
  const rustle = multiply(bandpass(whiteNoise(n, random), fs, 2200, 0.7), (i) => rustleCurve[i]);

  return mix([breeze, 0.8], [far, 0.18], [owl, 0.06], [rustle, 0.15]);
};

// ---- Rhythmic ----

/** About 64 beats a minute: close to a resting heart, and divides the loop evenly. */
const HEART_BPM = 64;

function heartbeatLayer(fs: number, n: number, random: Random): Float32Array {
  const out = new Float32Array(n);
  const beats = Math.round((n / fs) * (HEART_BPM / 60));
  const period = n / beats;
  const thump = (at: number, amp: number, pitch: number) => {
    const len = Math.round(0.22 * fs);
    const attack = Math.round(0.012 * fs);
    const thud = lowpass(whiteNoise(len, random), fs, 380, 2);
    // A soft knock around 250 Hz: the part of a heartbeat a phone speaker can play.
    const knock = bandpass(whiteNoise(len, random), fs, 250, 1.4);
    let phase = 0;
    addEvent(out, at, len, (k) => {
      const t = k / fs;
      const f = pitch * (1 + 0.5 * Math.exp(-t / 0.03));
      phase += (TAU * f) / fs;
      const env = fadeIn(k, attack) * Math.exp(-t / 0.055);
      // Soft saturation adds the overtones a phone speaker can play.
      return amp * (Math.tanh(3 * env * (Math.sin(phase) + 6 * thud[k])) + 9 * env * knock[k]);
    });
  };
  for (let b = 0; b < beats; b++) {
    const at = b * period + (random() - 0.5) * 0.004 * fs;
    thump(at, 1, 78);
    thump(at + 0.29 * fs, 0.62, 92);
  }
  return lowpass(out, fs, 900, 3);
}

/** A calm heartbeat ("lub-dub"), muffled as if heard from inside. */
export const heartbeat: Render = (fs, n, random) => {
  const beats = heartbeatLayer(fs, n, random);
  const hush = lowpass(brownNoise(n, random), fs, 250);
  return mix([beats, 1], [hush, 0.06]);
};

/** Womb: a deep, muffled whoosh of blood flow with the heartbeat underneath. */
export const womb: Render = (fs, n, random) => {
  const beats = Math.round((n / fs) * (HEART_BPM / 60));
  const period = n / beats;
  const whooshCurve = new Float32Array(n);
  for (let b = 0; b < beats; b++) {
    const len = Math.round(period * 0.95);
    addEvent(whooshCurve, b * period + 0.06 * fs, len, (k) => {
      const t = k / len;
      return Math.sin(Math.PI * Math.min(1, t * 2.2)) ** 2 * (1 - t) + 0.25;
    });
  }
  const body = mix(
    [bandpass(pinkNoise(n, random), fs, 320, 0.6), 1.6],
    [lowpass(brownNoise(n, random), fs, 520, 2), 0.5],
  );
  const whoosh = multiply(body, (i) => 0.35 + 0.65 * whooshCurve[i]);
  const rumble = lowpass(pinkNoise(n, random), fs, 180, 2);
  return mix([whoosh, 1], [heartbeatLayer(fs, n, random), 0.45], [rumble, 0.2]);
};

/** Shushing: a soft, steady "shhh … shhh", like a parent soothing. */
export const shushing: Render = (fs, n, random) => {
  const seconds = n / fs;
  const count = Math.max(1, Math.round(seconds / 2));
  const curve = new Float32Array(n);
  const tone = new Float32Array(n).fill(3000);
  const period = n / count;
  for (let s = 0; s < count; s++) {
    const len = Math.round(period * (0.8 + random() * 0.15));
    const pitch = 2700 + random() * 700;
    const at = s * period;
    addEvent(curve, at, len, (k) => {
      const t = k / len;
      const rise = Math.min(1, t / 0.18);
      const fall = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      return Math.sin((Math.PI / 2) * rise) ** 2 * fall ** 2 * (1 - 0.15 * t);
    });
    for (let k = 0; k < period; k++) tone[Math.round(at + k) % n] = pitch;
  }
  const shh = bandpass(whiteNoise(n, random), fs, lowpass(tone, fs, 2), 0.9);
  const breath = highpass(lowpass(pinkNoise(n, random), fs, 7000), fs, 1200);
  const out = mix(
    [multiply(shh, (i) => 0.15 + curve[i]), 1],
    [multiply(breath, (i) => 0.1 + 0.4 * curve[i]), 0.6],
  );
  return lowpass(out, fs, 7500);
};

/** A box fan: a steady airy whoosh with a soft motor hum. */
export const fan: Render = (fs, n, random) => {
  const seconds = n / fs;
  const air = lowpass(brownNoise(n, random), fs, 1000);
  const hiss = lowpass(pinkNoise(n, random), fs, 2600);
  // Whole cycles per loop, so the hum loops cleanly.
  const hum = 50;
  const cycles = Math.round(hum * seconds);
  const f = cycles / seconds;
  const motor = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    motor[i] =
      Math.sin(TAU * f * t) +
      0.5 * Math.sin(TAU * 2 * f * t) +
      0.35 * Math.sin(TAU * 3 * f * t) +
      0.2 * Math.sin(TAU * 4 * f * t);
  }
  const blades = Math.round(25 * seconds) / seconds;
  const out = mix([air, 1], [hiss, 0.9], [motor, 0.012]);
  return multiply(out, (i) => 0.96 + 0.04 * Math.sin((TAU * blades * i) / fs));
};

/** A car ride: deep road rumble, tyre noise and a soft engine hum, with gentle sway. */
export const carRide: Render = (fs, n, random) => {
  const seconds = n / fs;
  const rumble = lowpass(brownNoise(n, random), fs, 160, 2);
  const roadLevel = wander(n, seconds * 0.25, random);
  const road = multiply(
    bandpass(pinkNoise(n, random), fs, 520, 0.5),
    (i) => 0.6 + 0.4 * roadLevel[i],
  );
  const engine = new Float32Array(n);
  const base = Math.round(31 * seconds) / seconds;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    engine[i] =
      Math.sin(TAU * base * t) +
      0.6 * Math.sin(TAU * 2 * base * t) +
      0.4 * Math.sin(TAU * 3 * base * t) +
      0.25 * Math.sin(TAU * 4 * base * t);
  }
  // A few soft, slow road undulations (never a jolt).
  const bumps = new Float32Array(n);
  for (let b = 0; b < 3; b++) {
    const len = Math.round(0.5 * fs);
    let phase = 0;
    addEvent(bumps, random() * n, len, (k) => {
      phase += (TAU * 48) / fs;
      return Math.sin((Math.PI * k) / len) ** 2 * Math.sin(phase);
    });
  }
  const sway = wander(n, seconds * 0.15, random);
  const out = mix([rumble, 0.6], [road, 1.4], [engine, 0.02], [bumps, 0.06]);
  return lowpass(
    multiply(out, (i) => 0.85 + 0.15 * sway[i]),
    fs,
    2200,
  );
};

/** A train: steady rumble with the soft "ta-dum … ta-dum" of the rails. */
export const train: Render = (fs, n, random) => {
  const seconds = n / fs;
  const rumble = lowpass(brownNoise(n, random), fs, 220, 2);
  const carriage = bandpass(pinkNoise(n, random), fs, 700, 0.6);
  const swayCycles = Math.max(1, Math.round(seconds / 4));
  const clacks = new Float32Array(n);
  const patterns = Math.max(1, Math.round(seconds / 1.6));
  const period = n / patterns;
  const clack = (at: number, amp: number) => {
    const len = Math.round(0.18 * fs);
    const attack = Math.round(0.004 * fs);
    const noise = whiteNoise(len, random);
    let phase = 0;
    addEvent(clacks, at, len, (k) => {
      phase += (TAU * 140) / fs;
      const env = fadeIn(k, attack) * Math.exp(-k / (0.035 * fs));
      return amp * env * (0.6 * noise[k] + Math.sin(phase));
    });
  };
  for (let p = 0; p < patterns; p++) {
    const at = p * period;
    clack(at, 1);
    clack(at + 0.13 * fs, 0.85);
    clack(at + 0.56 * fs, 0.55);
    clack(at + 0.69 * fs, 0.5);
  }
  const softClacks = lowpass(bandpass(clacks, fs, 480, 0.7), fs, 1200);
  const out = mix([rumble, 0.6], [carriage, 1], [softClacks, 0.9]);
  return multiply(out, (i) => 0.9 + 0.1 * Math.sin((TAU * swayCycles * i) / n));
};
