"use client";

import { useCallback, useSyncExternalStore } from "react";

// Expanded/collapsed state for a collapsible card, remembered per browser so
// someone who closes it once doesn't have to close it again every visit.
const listeners = new Map<string, Set<() => void>>();
// Fallback for when localStorage is blocked, so the toggle still works for
// this page view.
const memory = new Map<string, boolean>();

function read(key: string): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? (memory.get(key) ?? true) : stored === "1";
  } catch {
    return memory.get(key) ?? true;
  }
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => { set.delete(listener); };
}

// Open by default; returns [open, toggle].
export function usePersistedOpen(key: string): [boolean, () => void] {
  const open = useSyncExternalStore(
    useCallback((l: () => void) => subscribe(key, l), [key]),
    () => read(key),
    () => true,
  );

  const toggle = useCallback(() => {
    const next = !read(key);
    memory.set(key, next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // Blocked storage: memory covers this page view.
    }
    listeners.get(key)?.forEach((l) => l());
  }, [key]);

  return [open, toggle];
}
