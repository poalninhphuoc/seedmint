import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { InputFormat, OutputFormat } from "@seedmint/core";

export interface Detected {
  orm: "prisma" | "drizzle" | "zod" | "sql";
  schema: string; // relative to cwd, forward slashes
  from: InputFormat;
  format: OutputFormat;
}

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".vercel"]);

function walk(root: string, depth = 4, out: string[] = []): string[] {
  if (depth < 0 || out.length > 3000) return out;
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return out;
  }
  for (const n of names) {
    if (SKIP.has(n)) continue;
    const p = join(root, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, depth - 1, out);
    else if (/\.(prisma|ts|tsx|sql)$/.test(n) && !n.endsWith(".d.ts") && st.size < 500_000) out.push(p);
  }
  return out;
}

const read = (p: string) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

/** Looks for a Prisma, Drizzle, Zod or SQL schema in the project and suggests how to seed it. */
export function detectProject(cwd: string): Detected | undefined {
  const rel = (p: string) => relative(cwd, p).split("\\").join("/");
  const files = walk(cwd);

  const prisma = ["prisma/schema.prisma", "schema.prisma"].map((p) => join(cwd, p)).find(existsSync) ?? files.find((f) => f.endsWith(".prisma"));
  if (prisma) return { orm: "prisma", schema: rel(prisma), from: "prisma", format: "prisma" };

  const drizzle = files.find((f) => /\.tsx?$/.test(f) && /(pg|mysql|sqlite)Table\s*\(/.test(read(f)));
  if (drizzle) return { orm: "drizzle", schema: rel(drizzle), from: "drizzle", format: "drizzle" };

  const zod = files.filter((f) => /\.tsx?$/.test(f) && /z\s*\.\s*object\s*\(/.test(read(f)));
  const zodPick = zod.find((f) => /schema|valid/i.test(f)) ?? zod[0];
  if (zodPick) return { orm: "zod", schema: rel(zodPick), from: "zod", format: "json" };

  const sql = files.find((f) => f.endsWith(".sql") && /create\s+table/i.test(read(f)));
  if (sql) return { orm: "sql", schema: rel(sql), from: "sql", format: "sql" };
  return undefined;
}
