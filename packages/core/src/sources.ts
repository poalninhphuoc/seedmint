import type { InputFormat } from "./types.js";

export interface SourceFile {
  /** Path relative to the scanned folder, using "/" separators. */
  path: string;
  content: string;
}

export interface CollectedSource {
  format: InputFormat;
  /** All files of the chosen format joined into one schema text. */
  source: string;
  used: string[];
  skipped: string[];
}

const IGNORED = /(^|\/)(node_modules|\.git|\.next|\.turbo|dist|build|coverage|migrations)(\/|$)/;
const TS_FILE = /\.(ts|tsx|mts)$/;

/**
 * Picks the schema files out of a scanned project folder and joins them, so a schema split over many files
 * (Prisma's prisma/schema/*.prisma, several Drizzle files) is read as one system. Prisma wins over SQL, SQL over TypeScript.
 */
export function collectSchemaSource(files: SourceFile[]): CollectedSource {
  const candidates = files
    .map((f) => ({ ...f, path: f.path.replace(/\\/g, "/") }))
    .filter((f) => !IGNORED.test(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  const ts = candidates.filter((f) => TS_FILE.test(f.path) && !/\.(d|test|spec)\.[mc]?tsx?$/.test(f.path));

  const groups: [InputFormat, typeof candidates][] = [
    ["prisma", candidates.filter((f) => f.path.endsWith(".prisma") && /\b(model|enum)\s+\w+\s*\{/.test(f.content))],
    ["sql", candidates.filter((f) => f.path.endsWith(".sql") && /create\s+table/i.test(f.content))],
    ["drizzle", ts.filter((f) => /\b(pgTable|mysqlTable|sqliteTable)\s*\(/.test(f.content))],
    ["zod", ts.filter((f) => /from\s+["']zod["']/.test(f.content) && /\bz\.object\s*\(/.test(f.content))],
    ["dbml", candidates.filter((f) => f.path.endsWith(".dbml") && /\btable\s+/i.test(f.content))],
    ["graphql", candidates.filter((f) => /\.(graphql|gql)$/.test(f.path) && /\btype\s+\w+\s*\{/.test(f.content))],
    ["openapi", candidates.filter((f) => /\.(ya?ml|json)$/.test(f.path) && /^\s*[{]?\s*["']?(openapi|swagger)["']?\s*:/m.test(f.content))],
    ["jsonschema", candidates.filter((f) => f.path.endsWith(".json") && /"\$schema"|"properties"/.test(f.content))],
  ];
  const [format, found] = groups.find(([, g]) => g.length) ?? ["ts" as InputFormat, []];
  // JSON/YAML documents cannot be concatenated, so an OpenAPI folder uses its first spec only.
  const picked = format === "openapi" ? found.slice(0, 1) : found;
  if (!picked.length) throw new Error("No schema files found (looked for .prisma, .sql, .dbml, .graphql, OpenAPI, Drizzle and Zod .ts files).");

  const usedSet = new Set(picked.map((f) => f.path));
  return {
    format,
    source: format === "openapi" ? picked[0].content : picked.map((f) => `// ${f.path}\n${f.content.trim()}`).join("\n\n") + "\n",
    used: picked.map((f) => f.path),
    skipped: candidates.map((f) => f.path).filter((p) => !usedSet.has(p)),
  };
}
