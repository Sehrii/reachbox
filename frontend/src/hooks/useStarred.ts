"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Stars are a per-browser convenience, so they live in localStorage. */
const KEY = "onb:starred";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string {
  if (cache !== null) return cache;
  try {
    cache = localStorage.getItem(KEY) ?? "[]";
  } catch {
    cache = "[]";
  }
  return cache;
}

function write(ids: string[]) {
  cache = JSON.stringify(ids);
  try {
    localStorage.setItem(KEY, cache);
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStarred() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const ids: string[] = JSON.parse(raw);
  const isStarred = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    [ids],
  );
  return { isStarred, toggle };
}
