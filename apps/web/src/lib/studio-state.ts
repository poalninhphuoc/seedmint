import { SAMPLE_SCHEMA } from "@/lib/sample";
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

const SCHEMA_KEY = "seedmint:schema";
const SETTINGS_KEY = "seedmint:studio";
const VIEW_KEY = "seedmint:view";

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage can be blocked or full */
  }
};

export const loadSchema = () => read(SCHEMA_KEY);
export const saveSchema = (v: string) => write(SCHEMA_KEY, v);

export function loadSettings(): Partial<StudioSettings> {
  try {
    return JSON.parse(read(SETTINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
export const saveSettings = (s: StudioSettings) => write(SETTINGS_KEY, JSON.stringify(s));

/** What the Studio shows: reloading restores it (the data itself is rebuilt from the schema, settings and seed). */
export interface StudioView {
  tab: string;
  generated: boolean;
  /** Row the user followed a foreign key to. */
  focus: { table: string; column: string; value: string | number | boolean } | null;
}

export function loadView(): StudioView | null {
  try {
    const v = JSON.parse(read(VIEW_KEY) ?? "null");
    return v && typeof v.tab === "string" ? { tab: v.tab, generated: !!v.generated, focus: v.focus ?? null } : null;
  } catch {
    return null;
  }
}
export const saveView = (v: StudioView) => write(VIEW_KEY, JSON.stringify(v));

export { SAMPLE_SCHEMA };
