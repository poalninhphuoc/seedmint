"use server";

import {
  SQL_DIALECTS, SUPPORTED_LOCALES, collectSchemaSource, detectFormat, formatDataset, mint, parseSchema,
  planColumns, render,
  type InputFormat, type RegionFormat, type Schema, type SourceFile, type SqlDialect,
} from "@seedmint/core";

import { EXPORT_FORMATS, type ExportFormat } from "@/lib/formats";

export interface GenerateInput {
  schema: string;
  from: InputFormat | "auto";
  locale: string;
  rows: number;
  /** Overrides `rows` for single tables; 0 leaves a table empty. */
  tableRows?: Record<string, number>;
  seed: number;
  format: ExportFormat;
  edgeCases: boolean;
  dialect: SqlDialect;
  ddl: boolean;
  /** Write dates and numbers the way `region` says in the preview, CSV and Excel. */
  regional: boolean;
  region: RegionFormat;
  /** Reference day (YYYY-MM-DD) so a saved run can be reproduced later. */
  now?: string;
  /** Pack several files into one zip (used by one-click exports). */
  bundle?: boolean;
  /** Hand-edited cells: table → row number in the generated data → column → value. Applied before formatting and export. */
  edits?: CellEdits;
}

export type CellEdits = Record<string, Record<string, Record<string, string | number | boolean | null>>>;

/** Writes the edits into the generated rows. Unknown tables, rows and columns are ignored. */
function applyEdits(data: Record<string, Record<string, unknown>[]>, edits: CellEdits | undefined) {
  for (const [table, byRow] of Object.entries(edits ?? {})) {
    const rows = Object.hasOwn(data, table) ? data[table] : undefined;
    if (!rows || !byRow || typeof byRow !== "object") continue;
    for (const [i, cols] of Object.entries(byRow)) {
      const row = /^\d+$/.test(i) ? rows[Number(i)] : undefined;
      if (!row || !cols || typeof cols !== "object") continue;
      for (const [col, v] of Object.entries(cols)) {
        if (!Object.hasOwn(row, col)) continue;
        if (v === null || ["string", "number", "boolean"].includes(typeof v)) row[col] = v;
      }
    }
  }
}

/** Text files carry their content; binary files (xlsx) carry base64. */
export interface OutputFile { name: string; content: string; binary?: boolean }

export interface PreviewTable {
  name: string;
  columns: string[];
  /** Per column: the table and column it points at, or null when it is not a foreign key. */
  refs: ({ table: string; field: string } | null)[];
  rows: (string | number | boolean | null)[][];
  total: number;
}

export type GenerateResult =
  | {
      ok: true;
      files: OutputFile[];
      detected: InputFormat;
      now: string;
      tables: { name: string; fields: number; rows: number }[];
      preview: PreviewTable[];
    }
  | { ok: false; error: string };

const MAX_ROWS = 1000;
const MAX_SCHEMA = 3_000_000;
const PREVIEW_ROWS = 200;

const clampRows = (n: unknown) => Math.min(Math.max(0, Math.floor(Number(n)) || 0), MAX_ROWS);

function cell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

async function toXlsx(data: Record<string, Record<string, unknown>[]>, schema: Schema, input: GenerateInput): Promise<string> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "seedmint";
  // Excel shows separators according to the reader's own settings, so only the date pattern is ours to set.
  const dateFmt = input.region.date.replace(/yyyy/, "yyyy").replace(/MM/, "mm").toLowerCase();
  for (const table of schema.tables) {
    const rows = data[table.name];
    if (!rows) continue;
    const plan = planColumns(table);
    const ws = wb.addWorksheet(table.name.replace(/[\[\]:*?/\\]/g, "_").slice(0, 31) || "Sheet");
    ws.columns = table.fields.map((f, i) => ({ header: f.name, key: f.name, width: Math.min(40, Math.max(12, f.name.length + 4)), style: columnStyle(plan[i], input.regional, dateFmt) }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of rows) {
      ws.addRow(Object.fromEntries(table.fields.map((f, i) => {
        const v = r[f.name];
        if (v === null || v === undefined) return [f.name, null];
        if (plan[i].date && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return [f.name, new Date(v.length === 10 ? `${v}T00:00:00Z` : v)];
        return [f.name, typeof v === "object" ? JSON.stringify(v) : v];
      })));
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");
}

function columnStyle(p: { date: boolean; time: boolean; number: "group" | "decimal" | null }, regional: boolean, dateFmt: string) {
  if (p.date) return { numFmt: regional ? (p.time ? `${dateFmt} hh:mm:ss` : dateFmt) : p.time ? "yyyy-mm-dd hh:mm:ss" : "yyyy-mm-dd" };
  if (p.number === "group" && regional) return { numFmt: "#,##0.##" };
  return {};
}

function build(input: GenerateInput) {
  if (!input.schema.trim()) throw new Error("Schema is empty.");
  if (input.schema.length > MAX_SCHEMA) throw new Error("Schema is too large (3 MB max).");
  if (!EXPORT_FORMATS.includes(input.format)) throw new Error(`Unknown format "${input.format}".`);
  if (!SUPPORTED_LOCALES.includes(input.locale)) throw new Error(`Unknown locale "${input.locale}".`);
  if (!SQL_DIALECTS.includes(input.dialect)) throw new Error(`Unknown SQL dialect "${input.dialect}".`);

  const detected = input.from === "auto" ? detectFormat(input.schema) : input.from;
  const schema = parseSchema(input.schema, detected);
  const seed = Number.isFinite(input.seed) ? input.seed : 42;
  const rows: Record<string, number> = { "*": clampRows(input.rows) };
  for (const [k, v] of Object.entries(input.tableRows ?? {})) rows[k] = clampRows(v);
  const now = /^\d{4}-\d{2}-\d{2}$/.test(input.now ?? "") ? input.now! : new Date().toISOString().slice(0, 10);
  const data = mint({ schema, locale: input.locale, rows, seed, edgeCases: input.edgeCases, now: new Date(now) });
  applyEdits(data, input.edits);
  return { detected, schema, seed, data, now };
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  try {
    const { detected, schema, seed, data, now } = build(input);
    const shown = input.regional ? formatDataset(data, schema, input.region) : data;
    const csvMeta = input.regional ? { delimiter: input.region.decimal === "," ? ";" : ",", bom: true } : {};

    let files: OutputFile[];
    if (input.format === "xlsx") files = [{ name: "data.xlsx", content: await toXlsx(data, schema, input), binary: true }];
    else if (input.format === "csv") files = render(shown, "csv", schema, csvMeta);
    else files = render(data, input.format, schema, { locale: input.locale, seed, dialect: input.dialect, ddl: input.ddl });

    if (input.bundle && files.length > 1) {
      const { zipSync, strToU8 } = await import("fflate");
      const zipped = zipSync(Object.fromEntries(files.map((f) => [f.name, f.binary ? Uint8Array.from(Buffer.from(f.content, "base64")) : strToU8(f.content)])));
      files = [{ name: "seedmint-export.zip", content: Buffer.from(zipped).toString("base64"), binary: true }];
    }

    return {
      ok: true,
      files,
      detected,
      now,
      tables: schema.tables.map((t) => ({ name: t.name, fields: t.fields.length, rows: data[t.name]?.length ?? 0 })),
      preview: schema.tables.map((t) => {
        const rows = shown[t.name] ?? [];
        return {
          name: t.name,
          columns: t.fields.map((f) => f.name),
          refs: t.fields.map((f) => (f.ref && f.ref.table !== t.name ? { table: f.ref.table, field: f.ref.field } : null)),
          rows: rows.slice(0, PREVIEW_ROWS).map((r) => t.fields.map((f) => cell(r[f.name]))),
          total: rows.length,
        };
      }),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate data." };
  }
}

export interface AnalyzeResult {
  ok: true;
  detected: InputFormat;
  tables: {
    name: string;
    group?: string;
    fields: { name: string; kind: string; primary?: boolean; optional?: boolean; ref?: { table: string; field: string; group?: string } }[];
  }[];
}

/** Parses a schema into tables and fields for the diagram and table list. */
export async function analyze(input: { schema: string; from: InputFormat | "auto" }): Promise<AnalyzeResult | { ok: false; error: string }> {
  try {
    if (!input.schema.trim()) return { ok: false, error: "Schema is empty." };
    if (input.schema.length > MAX_SCHEMA) return { ok: false, error: "Schema is too large (3 MB max)." };
    const detected = input.from === "auto" ? detectFormat(input.schema) : input.from;
    const schema = parseSchema(input.schema, detected);
    return {
      ok: true,
      detected,
      tables: schema.tables.map((t) => ({
        name: t.name,
        group: t.group,
        fields: t.fields.map((f) => ({ name: f.name, kind: f.kind, primary: f.primary, optional: f.optional, ref: f.ref })),
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the schema." };
  }
}

export interface ImportedFile { path: string; used: boolean; /** Tables declared in the file (0 for ignored files). */ tables: number }

export type ImportResult =
  | { ok: true; format: InputFormat; source: string; used: string[]; skipped: number; files: ImportedFile[] }
  | { ok: false; error: string };

const TABLE_PATTERN: Partial<Record<InputFormat, RegExp>> = {
  prisma: /^\s*model\s+\w+/gm,
  sql: /create\s+table/gi,
  drizzle: /(pgTable|mysqlTable|sqliteTable)\s*\(/g,
  zod: /\bz\.object\s*\(/g,
};

/** Reads a scanned project folder: picks the schema files and joins them into one schema text. */
export async function importFiles(files: SourceFile[]): Promise<ImportResult> {
  try {
    const total = files.reduce((n, f) => n + f.content.length, 0);
    if (total > MAX_SCHEMA * 2) return { ok: false, error: "The folder is too large to import." };
    const got = collectSchemaSource(files);
    const byPath = new Map(files.map((f) => [f.path.replace(/\\/g, "/"), f.content]));
    const pattern = TABLE_PATTERN[got.format];
    const listed: ImportedFile[] = [
      ...got.used.map((path) => ({ path, used: true, tables: pattern ? (byPath.get(path)?.match(pattern) ?? []).length : 0 })),
      ...got.skipped.slice(0, 300).map((path) => ({ path, used: false, tables: 0 })),
    ];
    return { ok: true, format: got.format, source: got.source, used: got.used, skipped: got.skipped.length, files: listed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the folder." };
  }
}
