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

export { SAMPLE_SCHEMA };
