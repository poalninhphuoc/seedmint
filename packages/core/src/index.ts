export { parseSchema, detectFormat, finalize } from "./parse.js";
export { mint, type MintOptions } from "./generate.js";
export { render, OUTPUT_FORMATS, SQL_DIALECTS, type OutFile, type RenderMeta, type SqlDialect } from "./format.js";
export {
  DATE_PATTERNS, DECIMAL_SEPARATORS, THOUSANDS_SEPARATORS, regionDefaults, formatDataset, planColumns, formatDate, formatNumber,
  type ColumnPlan, type RegionFormat,
} from "./regional.js";
export { collectSchemaSource, type CollectedSource, type SourceFile } from "./sources.js";
export { SUPPORTED_LOCALES } from "./locales.js";
export type { Schema, Table, Field, FieldKind, Dataset, Row, InputFormat, OutputFormat, SeedmintConfig } from "./types.js";

import type { SeedmintConfig } from "./types.js";

/** Identity helper that gives `seedmint.config.ts` autocomplete. */
export const defineConfig = (config: SeedmintConfig): SeedmintConfig => config;
