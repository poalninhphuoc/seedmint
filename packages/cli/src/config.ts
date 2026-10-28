import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import type { SeedmintConfig } from "@seedmint/core";

export const CONFIG_NAMES = ["seedmint.config.ts", "seedmint.config.mjs", "seedmint.config.js", "seedmint.config.json"];

export function findConfig(cwd: string): string | undefined {
  return CONFIG_NAMES.map((n) => join(cwd, n)).find(existsSync);
}

/** Loads seedmint.config.*. TypeScript configs are transpiled on the fly, so use `import type` only. */
export async function loadConfig(path: string): Promise<SeedmintConfig> {
  const src = readFileSync(path, "utf8");
  if (path.endsWith(".json")) return JSON.parse(src) as SeedmintConfig;
  const js = path.endsWith(".ts")
    ? ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    : src;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return (mod.default ?? mod) as SeedmintConfig;
}

export function configTemplate(c: { schema: string; from: string; format: string; out: string }): string {
  return `import type { SeedmintConfig } from "seedmint";

// Run: npx seedmint generate
const config: SeedmintConfig = {
  schema: ${JSON.stringify(c.schema)},
  from: ${JSON.stringify(c.from)},
  locale: ["en"], // e.g. ["vi", "en"]; supported: en vi ja ko zh th id fr de es
  rows: 20, // or { users: 50, "*": 10 }
  seed: 42,
  format: ${JSON.stringify(c.format)}, // json | jsonl | csv | sql | ts | prisma | drizzle | prompt
  out: ${JSON.stringify(c.out)},
};

export default config;
`;
}
