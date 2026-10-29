import { SAMPLE_SCHEMA } from "@/lib/sample";
import { readItem, writeItem } from "@/lib/storage";
import { slotKey } from "@/lib/current-project";
import type { CellEdits } from "@/app/actions";
import type { ExportFormat } from "@/lib/formats";
import type { InputFormat, RegionFormat, SqlDialect } from "@seedmint/core";

export interface StudioSettings {
  from: InputFormat | "auto";
  locale: string;
  rows: number;
  tableRows: Record<string, number>;
  seed: number;
  format: ExportFormat;
  edgeCases: boolean;
  dialect: SqlDialect;
  ddl: boolean;
  regional: boolean;
  region: RegionFormat;
}

type Slot = Parameters<typeof slotKey>[0];
/** Reads and writes go to the open project's own slot, so two projects never share a schema, settings or edits. */
const read = (slot: Slot) => {
  const k = slotKey(slot);
  return k ? readItem(k) : null;
};
const write = (slot: Slot, v: string) => {
  const k = slotKey(slot);
  return k ? writeItem(k, v) : true;
};

export const loadSchema = () => read("schema");
export const saveSchema = (v: string) => write("schema", v);

export function loadSettings(): Partial<StudioSettings> {
  try {
    return JSON.parse(read("studio") ?? "{}");
  } catch {
    return {};
  }
}
/** Saved settings filled in with the Studio defaults, for pages that file a version without opening the Studio. */
export function fullSettings(): StudioSettings {
  const s = loadSettings();
  return {
    from: "auto", locale: "en", rows: 10, tableRows: {}, seed: 42, format: "json", edgeCases: false,
    dialect: "postgres", ddl: true, regional: true, ...s,
    region: { date: "yyyy-MM-dd", decimal: ".", thousands: ",", ...s.region },
  };
}
export const saveSettings = (s: StudioSettings) => write("studio", JSON.stringify(s));

/** What the Studio shows: reloading restores it (the data itself is rebuilt from the schema, settings and seed). */
export interface StudioView {
  tab: string;
  generated: boolean;
  /** Row the user followed a foreign key to. */
  focus: { table: string; column: string; value: string | number | boolean } | null;
}

export function loadView(): StudioView | null {
  try {
    const v = JSON.parse(read("view") ?? "null");
    return v && typeof v.tab === "string" ? { tab: v.tab, generated: !!v.generated, focus: v.focus ?? null } : null;
  } catch {
    return null;
  }
}
/** Identifies the run (schema, settings, seed) a set of cell edits belongs to: edits address rows by number. */
export const runKeyOf = (schema: string, s: StudioSettings) =>
  JSON.stringify([schema, s.from, s.locale, s.rows, s.tableRows, s.seed, s.edgeCases]);

/** Short fingerprint, so the stored edits do not carry a second copy of the schema. */
const fingerprint = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `${text.length}:${(h >>> 0).toString(36)}`;
};

/** Cell edits made in the Studio's tables, kept so a reload does not throw them away. */
export function loadEdits(key: string): CellEdits {
  try {
    const v = JSON.parse(read("edits") ?? "null");
    return v && v.key === fingerprint(key) && v.edits && typeof v.edits === "object" ? v.edits : {};
  } catch {
    return {};
  }
}
export const saveEdits = (key: string, edits: CellEdits) =>
  write("edits", JSON.stringify(Object.keys(edits).length ? { key: fingerprint(key), edits } : null));

export const saveView = (v: StudioView) => write("view", JSON.stringify(v));

export { SAMPLE_SCHEMA };
