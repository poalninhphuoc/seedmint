import type { PreviewTable } from "@/app/actions";
import { readItem, removeItem, writeItem } from "@/lib/storage";
import { slotKey } from "@/lib/current-project";

export type Cell = string | number | boolean | null;

export interface DataTable {
  name: string;
  columns: string[];
  /** Per column: the table and column it points at, or null when it is not a foreign key. */
  refs: ({ table: string; field: string } | null)[];
  rows: Cell[][];
}

/** The rows the data admin edits, tied to the schema text they were generated from. */
export interface Dataset {
  schema: string;
  at: string;
  tables: DataTable[];
}

export type Kind = "number" | "boolean" | "string";

/** A snapshot kept inside a history version stays under this many characters of JSON. */
export const MAX_SNAPSHOT = 120_000;

export function loadDataset(): Dataset | null {
  try {
    const v = JSON.parse(readItem(slotKey("dataset") ?? "") ?? "null");
    return v && Array.isArray(v.tables) && typeof v.schema === "string" ? v : null;
  } catch {
    return null;
  }
}

/** False when the browser refused the write (storage full): the rows would be gone after a reload. */
export function saveDataset(d: Dataset | null): boolean {
  const key = slotKey("dataset");
  if (!key) return true;
  if (!d) {
    removeItem(key);
    return true;
  }
  return writeItem(key, JSON.stringify(d));
}

/** Null when the preview holds only part of the rows (it is capped), because editing a partial table would lose data. */
export function fromPreview(schema: string, preview: PreviewTable[]): Dataset | null {
  if (preview.some((p) => p.total > p.rows.length)) return null;
  return { schema, at: new Date().toISOString(), tables: preview.map((p) => ({ name: p.name, columns: p.columns, refs: p.refs, rows: p.rows })) };
}

/** A snapshot small enough to keep in history, else null. */
export const snapshot = (d: Dataset | null): Dataset | null => (d && JSON.stringify(d).length <= MAX_SNAPSHOT ? d : null);

export function kindOf(t: DataTable, col: number): Kind {
  const seen = t.rows.map((r) => r[col]).filter((v) => v !== null);
  if (seen.length && seen.every((v) => typeof v === "number")) return "number";
  if (seen.length && seen.every((v) => typeof v === "boolean")) return "boolean";
  return "string";
}

/** A numeric column called id is numbered by the admin, so a new row never needs it typed. */
export const isAutoId = (t: DataTable, col: number) => t.columns[col].toLowerCase() === "id" && kindOf(t, col) === "number";

export const nextId = (t: DataTable, col: number) => t.rows.reduce((m, r) => (typeof r[col] === "number" ? Math.max(m, r[col] as number) : m), 0) + 1;

/** Text from a form field → a cell. Undefined when the text is not valid for the column. */
export function coerce(text: string, kind: Kind): Cell | undefined {
  const s = text.trim();
  if (kind === "string") return text === "" ? null : text;
  if (s === "") return null;
  if (kind === "number") {
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return s === "true" ? true : s === "false" ? false : undefined;
}

const withTable = (d: Dataset, name: string, f: (rows: Cell[][]) => Cell[][]): Dataset => ({
  ...d, tables: d.tables.map((t) => (t.name === name ? { ...t, rows: f(t.rows) } : t)),
});

export const insertRow = (d: Dataset, table: string, row: Cell[]) => withTable(d, table, (rows) => [...rows, row]);
export const updateRow = (d: Dataset, table: string, at: number, row: Cell[]) => withTable(d, table, (rows) => rows.map((r, i) => (i === at ? row : r)));
export const deleteRow = (d: Dataset, table: string, at: number) => withTable(d, table, (rows) => rows.filter((_, i) => i !== at));

/** Other rows that still point at this one: [table, how many]. */
export function referencing(d: Dataset, table: string, at: number): { table: string; count: number }[] {
  const target = d.tables.find((t) => t.name === table)?.rows[at];
  const own = d.tables.find((t) => t.name === table);
  if (!target || !own) return [];
  const out: { table: string; count: number }[] = [];
  for (const t of d.tables) {
    let count = 0;
    t.refs.forEach((ref, col) => {
      if (ref?.table !== table) return;
      const v = target[own.columns.indexOf(ref.field)];
      if (v === null || v === undefined) return;
      count += t.rows.filter((r, i) => !(t.name === table && i === at) && r[col] === v).length;
    });
    if (count) out.push({ table: t.name, count });
  }
  return out;
}

/** Distinct values of the column a foreign key points at, for a picker. */
export function choices(d: Dataset, ref: { table: string; field: string }): Cell[] {
  const t = d.tables.find((x) => x.name === ref.table);
  const col = t?.columns.indexOf(ref.field) ?? -1;
  return t && col >= 0 ? [...new Set(t.rows.map((r) => r[col]).filter((v) => v !== null))] : [];
}

const csvCell = (v: Cell) => (v === null ? "" : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export const toCsv = (t: DataTable) => [t.columns, ...t.rows].map((r) => r.map(csvCell).join(",")).join("\n");

/** Every table as { name: [{column: value}] }. */
export const toJson = (d: Dataset) =>
  JSON.stringify(Object.fromEntries(d.tables.map((t) => [t.name, t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])))])), null, 2);
