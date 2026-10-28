import type { StudioSettings } from "@/lib/studio-state";

export interface HistoryEntry {
  id: string;
  at: string;
  kind: "generate" | "export";
  now: string;
  settings: StudioSettings;
  /** Null when the schema was too large to keep. */
  schema: string | null;
  tables: number;
  rows: number;
  files: string[];
}

const KEY = "seedmint:history";
const LIMIT = 40;
const MAX_SCHEMA_KEPT = 200_000;

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(list: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* full or blocked */
  }
}

export function addHistory(e: Omit<HistoryEntry, "id" | "at" | "schema"> & { schema: string }) {
  const entry: HistoryEntry = {
    ...e,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    schema: e.schema.length <= MAX_SCHEMA_KEPT ? e.schema : null,
  };
  save([entry, ...loadHistory()].slice(0, LIMIT));
}

export const removeHistory = (id: string) => save(loadHistory().filter((h) => h.id !== id));
export const clearHistory = () => save([]);
