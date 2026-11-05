import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MAX_MIX_LAYERS, type Program } from '@/audio/program';
import { findSound } from '@/store/recordings';

/**
 * A saved mix. Layers refer to sounds by id, so a mix keeps working when a
 * placeholder sound is replaced by its real recording.
 */
export type SavedMix = {
  id: string;
  name: string;
  layers: { soundId: string; volume: number }[];
};

type MixesState = {
  mixes: SavedMix[];
  /** Adds a new mix, or replaces the one with the same id. Returns the saved mix. */
  saveMix: (mix: Omit<SavedMix, 'id'> & { id?: string }) => SavedMix;
  deleteMix: (id: string) => void;
};

/**
 * Ready-made mixes, saved like the parent's own: they can play, edit or
 * delete them. They're added once (on a new install, or when updating from
 * a version without them) and never come back after being deleted.
 * Harmony Tones sit about 3.5 dB under the other sounds, so they get the
 * higher share here.
 */
export const PRESET_MIXES: SavedMix[] = [
  {
    id: 'preset-rain-528',
    name: 'Rain + 528',
    layers: [
      { soundId: 'rain', volume: 0.55 },
      { soundId: 'harmony-528', volume: 0.9 },
    ],
  },
  {
    id: 'preset-ocean-bowl',
    name: 'Ocean + Singing Bowl',
    layers: [
      { soundId: 'ocean-waves', volume: 0.55 },
      { soundId: 'bowl-soft', volume: 0.9 },
    ],
  },
  {
    id: 'preset-brown-174',
    name: 'Brown Noise + 174',
    layers: [
      { soundId: 'brown-noise', volume: 0.5 },
      { soundId: 'harmony-174', volume: 0.9 },
    ],
  },
];

/** Adds the presets that aren't already there (by id). */
export function withPresets(mixes: SavedMix[]): SavedMix[] {
  const have = new Set(mixes.map((m) => m.id));
  return [...mixes, ...PRESET_MIXES.filter((p) => !have.has(p.id))];
}

function newId() {
  return `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Saved mixes, kept on this device. Included in backup and restore. */
export const useMixes = create<MixesState>()(
  persist(
    (set, get) => ({
      // A new install starts with the ready-made mixes.
      mixes: PRESET_MIXES,
      saveMix: (mix) => {
        const saved: SavedMix = {
          id: mix.id ?? newId(),
          name: mix.name.trim() || 'My mix',
          layers: mix.layers.slice(0, MAX_MIX_LAYERS),
        };
        const others = get().mixes.filter((m) => m.id !== saved.id);
        const index = get().mixes.findIndex((m) => m.id === saved.id);
        set({
          mixes:
            index === -1
              ? [...others, saved]
              : [...others.slice(0, index), saved, ...others.slice(index)],
        });
        return saved;
      },
      deleteMix: (id) => set({ mixes: get().mixes.filter((m) => m.id !== id) }),
    }),
    {
      name: 'luna-mixes',
      // Version 2 added the ready-made mixes: add them once for people
      // updating from version 1. After that, whatever they keep or delete stays.
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { mixes?: SavedMix[] };
        return {
          mixes: version < 2 ? withPresets(state.mixes ?? []) : (state.mixes ?? []),
        } as MixesState;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ mixes }) => ({ mixes }),
    },
  ),
);

export function getMix(id: string): SavedMix | undefined {
  return useMixes.getState().mixes.find((m) => m.id === id);
}

/** Turns a saved mix into something the player can play (skipping missing sounds). */
export function mixToProgram(mix: SavedMix): Extract<Program, { kind: 'mix' }> {
  return {
    kind: 'mix',
    id: mix.id,
    name: mix.name,
    layers: mix.layers.flatMap(({ soundId, volume }) => {
      const sound = findSound(soundId);
      return sound ? [{ sound, volume }] : [];
    }),
  };
}
