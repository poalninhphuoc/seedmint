"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "seedmint:urlstate";

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(EVENT, notify);
  };
};
const snapshot = () => location.search;
const server = () => "";

export type UrlPatch = Record<string, string | null | undefined>;

/**
 * The query string as view state: `?table=Users&q=a` survives a reload and the Back button walks through it.
 * `push` (default) adds a history entry; `replace` rewrites the current one, for things like typing in a search box.
 * Empty or null values drop the key, so the default view keeps a clean URL.
 */
export function useUrlState() {
  const search = useSyncExternalStore(subscribe, snapshot, server);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const set = useCallback((patch: UrlPatch, mode: "push" | "replace" = "push") => {
    const next = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    if (qs === location.search.replace(/^\?/, "")) return;
    const url = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`;
    if (mode === "replace") history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { params, set };
}
