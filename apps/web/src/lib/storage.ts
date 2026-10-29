"use client";

import { useEffect, useState } from "react";

const EVENT = "seedmint:storage";

/** Tells every `useStorageFailed` listener whether the last write was kept. */
const report = (ok: boolean) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: ok }));
};

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false (and raises the warning) when the browser refused the write: storage full or blocked. */
export function writeItem(key: string, value: string, reportFailure = true): boolean {
  try {
    localStorage.setItem(key, value);
    report(true);
    return true;
  } catch {
    if (reportFailure) report(false);
    return false;
  }
}

export function removeItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* blocked */
  }
}

/** True after a save was refused, until a later save works. Work since then would be lost on reload. */
export function useStorageFailed(): boolean {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setFailed(!(e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return failed;
}
