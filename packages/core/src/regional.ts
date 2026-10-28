import { inferSemantic, type Semantic } from "./infer.js";
import type { Dataset, Row, Schema } from "./types.js";

/** How dates and numbers are written for people in one region. */
export interface RegionFormat {
  /** Date pattern using yyyy, MM and dd with any separators, e.g. "dd/MM/yyyy". */
  date: string;
  decimal: string;
  thousands: string;
}

export const DATE_PATTERNS = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd", "dd.MM.yyyy", "dd-MM-yyyy", "yyyy.MM.dd"] as const;
export const DECIMAL_SEPARATORS = [".", ","] as const;
export const THOUSANDS_SEPARATORS = [",", ".", " ", "'", ""] as const;

const NNBSP = " ";

const REGIONS: Record<string, RegionFormat> = {
  en: { date: "MM/dd/yyyy", decimal: ".", thousands: "," },
  vi: { date: "dd/MM/yyyy", decimal: ",", thousands: "." },
  ja: { date: "yyyy/MM/dd", decimal: ".", thousands: "," },
  ko: { date: "yyyy.MM.dd", decimal: ".", thousands: "," },
  zh: { date: "yyyy/MM/dd", decimal: ".", thousands: "," },
  th: { date: "dd/MM/yyyy", decimal: ".", thousands: "," },
  id: { date: "dd/MM/yyyy", decimal: ",", thousands: "." },
  fr: { date: "dd/MM/yyyy", decimal: ",", thousands: NNBSP },
  de: { date: "dd.MM.yyyy", decimal: ",", thousands: "." },
  es: { date: "dd/MM/yyyy", decimal: ",", thousands: "." },
};

/** Usual date and number conventions for a data locale code such as "vi". */
export function regionDefaults(locale: string): RegionFormat {
  return { ...(REGIONS[locale.split("-")[0]] ?? REGIONS.en) };
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/;

/** Rewrites an ISO date or datetime. Returns the input unchanged when it is not ISO. */
export function formatDate(iso: string, pattern: string, withTime = false): string {
  const m = ISO_DATE.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, h, mi, s] = m;
  const date = pattern.replace("yyyy", y).replace("MM", mo).replace("dd", d);
  return withTime && h !== undefined ? `${date} ${h}:${mi}:${s}` : date;
}

export function formatNumber(n: number, fmt: Pick<RegionFormat, "decimal" | "thousands">, group: boolean): string {
  if (!Number.isFinite(n)) return String(n);
  const [int, frac] = Math.abs(n).toString().split(".");
  const body = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, fmt.thousands) : int;
  return `${n < 0 ? "-" : ""}${body}${frac ? fmt.decimal + frac : ""}`;
}

const GROUPED: ReadonlySet<Semantic> = new Set(["money", "quantity", "int", "float"]);
const DECIMAL_ONLY: ReadonlySet<Semantic> = new Set(["rating", "percent", "lat", "lng"]);

export interface ColumnPlan {
  name: string;
  /** Holds a date (ISO text or a date/datetime column). */
  date: boolean;
  /** Date column that also carries a time of day. */
  time: boolean;
  /** "group": thousands separators and decimals. "decimal": decimals only. null: leave as is (ids, years, ages, zips). */
  number: "group" | "decimal" | null;
}

/** Decides, per column, which regional rules apply. Shared by the text formatter and the Excel export. */
export function planColumns(table: Schema["tables"][number]): ColumnPlan[] {
  return table.fields.map((f) => {
    const sem = inferSemantic(table.name, f);
    const numeric = (f.kind === "integer" || f.kind === "number") && !f.primary && !f.ref;
    return {
      name: f.name,
      date: f.kind === "date" || f.kind === "datetime" || sem === "dateStr",
      time: f.kind === "datetime",
      number: numeric ? (GROUPED.has(sem) ? "group" : DECIMAL_ONLY.has(sem) ? "decimal" : null) : null,
    };
  });
}

/**
 * Display copy of a dataset: dates and numbers are written as text the way people in a region read them.
 * Meant for previews, CSV and spreadsheets. Do not use it for SQL or code output, which need ISO dates and plain numbers.
 */
export function formatDataset(data: Dataset, schema: Schema, fmt: RegionFormat): Dataset {
  const out: Dataset = {};
  for (const table of schema.tables) {
    const rows = data[table.name];
    if (!rows) continue;
    const plan = planColumns(table);
    out[table.name] = rows.map((r) => {
      const row: Row = { ...r };
      for (const p of plan) {
        const v = r[p.name];
        if (typeof v === "string" && p.date) row[p.name] = formatDate(v, fmt.date, p.time);
        else if (typeof v === "number" && p.number) row[p.name] = formatNumber(v, fmt, p.number === "group");
      }
      return row;
    });
  }
  return out;
}
