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

function newId() {
  return `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Saved mixes, kept on this device. Included in backup and restore. */
export const useMixes = create<MixesState>()(
  persist(
    (set, get) => ({
      mixes: [],
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
      version: 1,
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
