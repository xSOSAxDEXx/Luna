import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A small on-device log of playback events, for testing on real phones
 * (background ticks, interruptions, how late the timer stopped). Only test
 * builds show it (EXPO_PUBLIC_DIAGNOSTICS=1, or development). It never
 * leaves the device unless the tester shares it.
 */
export const DIAGNOSTICS_ENABLED =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_DIAGNOSTICS === '1';

export type LogEntry = { t: number; event: string; detail?: Record<string, unknown> };

const STORAGE_KEY = 'luna-diagnostics';
const MAX_ENTRIES = 1000;

let entries: LogEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) entries = [...(JSON.parse(saved) as LogEntry[]), ...entries].slice(-MAX_ENTRIES);
    emit();
  } catch {
    // A missing or corrupt log isn't worth surfacing.
  }
}

export function logEvent(event: string, detail?: Record<string, unknown>) {
  if (!DIAGNOSTICS_ENABLED) return;
  void load();
  entries = [...entries, { t: Date.now(), event, detail }].slice(-MAX_ENTRIES);
  emit();
  // Written straight away (no debounce timer): JS timers don't run while the
  // app is in the background on Android, and that's when events matter most.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
}

export function clearLog() {
  entries = [];
  emit();
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function formatEntry({ t, event, detail }: LogEntry): string {
  const time = new Date(t).toTimeString().slice(0, 8);
  const extra = detail && Object.keys(detail).length > 0 ? ' ' + JSON.stringify(detail) : '';
  return `${time} ${event}${extra}`;
}

export function formatLog(): string {
  return entries.map(formatEntry).join('\n');
}

function subscribe(listener: () => void) {
  void load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getEntries = () => entries;

export function useDiagnosticsLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, getEntries, getEntries);
}
