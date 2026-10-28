export { parseSchema, detectFormat, finalize } from "./parse.js";
export { mint, type MintOptions } from "./generate.js";
export { render, OUTPUT_FORMATS, type OutFile, type RenderMeta } from "./format.js";
export { SUPPORTED_LOCALES } from "./locales.js";
export type { Schema, Table, Field, FieldKind, Dataset, Row, InputFormat, OutputFormat, SeedmintConfig } from "./types.js";

import type { SeedmintConfig } from "./types.js";

/** Identity helper that gives `seedmint.config.ts` autocomplete. */
export const defineConfig = (config: SeedmintConfig): SeedmintConfig => config;
