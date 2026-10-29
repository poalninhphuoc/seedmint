import { readItem, removeItem, writeItem } from "@/lib/storage";

const CURRENT_KEY = "seedmint:project";
/** What one project keeps apart from the others: the working state of the Studio and the data admin. */
const SLOTS = ["schema", "studio", "view", "edits", "dataset"] as const;

export const currentProjectId = () => readItem(CURRENT_KEY);
export const setCurrentProject = (id: string) => void writeItem(CURRENT_KEY, id, false);
export const clearCurrentProject = () => removeItem(CURRENT_KEY);

/** Storage key of one slot of the open project's working state; null when no project is open. */
export function slotKey(slot: (typeof SLOTS)[number], id = currentProjectId()): string | null {
  return id ? `seedmint:w:${id}:${slot}` : null;
}

export function forgetWork(id: string) {
  for (const s of SLOTS) removeItem(slotKey(s, id)!);
}
