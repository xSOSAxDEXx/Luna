import type { PlayableSound } from './types';

/** One layer of a mix: a sound and its own volume (0..1). */
export type MixLayer = { sound: PlayableSound; volume: number };

/**
 * What the player is playing:
 * - `single`: one sound, looped.
 * - `mix`: up to three sounds at once, each with its own volume.
 * - `shuffle`: one sound at a time from a set, with soft crossfades.
 */
export type Program =
  | { kind: 'single'; sound: PlayableSound }
  | { kind: 'mix'; id?: string; name: string; layers: MixLayer[] }
  | { kind: 'shuffle'; name: string; sounds: PlayableSound[] };

export const MAX_MIX_LAYERS = 3;
export const DEFAULT_LAYER_VOLUME = 0.8;
/** How long each sound plays in shuffle before crossfading to the next. */
export const SHUFFLE_TRACK_MS = 5 * 60_000;

export function single(sound: PlayableSound): Program {
  return { kind: 'single', sound };
}

export function programTitle(program: Program): string {
  return program.kind === 'single' ? program.sound.name : program.name;
}

/** The sounds a program can play, in their stored order. */
export function programSounds(program: Program): PlayableSound[] {
  if (program.kind === 'single') return [program.sound];
  if (program.kind === 'mix') return program.layers.map((l) => l.sound);
  return program.sounds;
}

/**
 * A random order for a shuffle set (Fisher–Yates). When `avoidFirst` is
 * given (the sound that just played), it won't come straight back.
 */
export function shuffleOrder(
  sounds: PlayableSound[],
  random: () => number = Math.random,
  avoidFirst?: string,
): PlayableSound[] {
  const order = [...sounds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (avoidFirst && order.length > 1 && order[0].id === avoidFirst) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

/** Equal-power crossfade gains for progress t (0..1): [outgoing, incoming]. */
export function crossfadeGains(t: number): [number, number] {
  const c = Math.min(1, Math.max(0, t));
  return [Math.cos((c * Math.PI) / 2), Math.sin((c * Math.PI) / 2)];
}
