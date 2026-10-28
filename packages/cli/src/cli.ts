#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  OUTPUT_FORMATS, SUPPORTED_LOCALES, collectSchemaSource, mint, parseSchema, render,
  type InputFormat, type OutputFormat, type SeedmintConfig, type SourceFile,
} from "@seedmint/core";
import { CONFIG_NAMES, configTemplate, findConfig, loadConfig } from "./config.js";
import { detectProject } from "./detect.js";

const HELP = `seedmint: realistic sample data from a schema

Usage:
  seedmint init                      detect Prisma/Drizzle/Zod/SQL in this project and write seedmint.config.ts
  seedmint generate [schema|folder] generate data (uses seedmint.config.* when present)
  seedmint <schema|->                same as generate; "-" reads stdin

Options:
  -l, --locale <codes>   comma list, e.g. vi,en (default en). Supported: ${SUPPORTED_LOCALES.join(", ")}
  -n, --rows <n|t=n,..>  rows per table, e.g. 50 or users=50,orders=200 (default 20)
  -f, --format <fmt>     ${OUTPUT_FORMATS.join(" | ")} (default json)
  -s, --seed <n>         seed for repeatable output (default 42)
      --from <fmt>       force input: ts | zod | sql | dsl | json | prisma | drizzle | jsonschema
      --edge-cases       sprinkle empty / long / emoji / quote / RTL strings
  -o, --out <path>       file (has an extension) or directory; default is stdout
      --force            init: overwrite an existing config
  -h, --help
`;

/** Reads every schema-looking file under a folder (prisma/schema/*.prisma, several Drizzle files, ...). */
function readFolder(root: string, dir = root, out: SourceFile[] = []): SourceFile[] {
  if (out.length > 2000) return out;
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) readFolder(root, p, out);
    else if (/\.(prisma|sql|ts|tsx|mts|json)$/.test(name) && st.size < 1_000_000) out.push({ path: p.slice(root.length + 1), content: readFileSync(p, "utf8") });
  }
  return out;
}

function parseRows(v: string | undefined): number | Record<string, number> | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Number(v);
  const map: Record<string, number> = {};
  for (const part of v.split(",")) {
    const [k, n] = part.split("=");
    map[k.trim()] = Number(n);
  }
  return map;
}

function init(cwd: string, force: boolean) {
  const existing = findConfig(cwd);
  if (existing && !force) {
    console.error(`seedmint: ${existing} already exists. Use --force to overwrite.`);
    process.exitCode = 1;
    return;
  }
  const found = detectProject(cwd);
  if (!found) console.error("No Prisma, Drizzle, Zod or SQL schema found. Writing a config you can edit.");
  else console.error(`Detected ${found.orm} schema: ${found.schema}`);
  const base = found?.schema.includes("/") ? dirname(found.schema) : ".";
  const out = found?.format === "prisma" || found?.format === "drizzle" ? join(base, "seed.ts").split("\\").join("/") : "seedmint-data";
  const file = join(cwd, "seedmint.config.ts");
  writeFileSync(file, configTemplate({
    schema: found?.schema ?? "schema.sql",
    from: found?.from ?? "sql",
    format: found?.format ?? "json",
    out,
  }));
  console.error(`Wrote ${file}\nNext: npx seedmint generate --locale=vi`);
}

async function generate(positional: string | undefined, v: Record<string, string | boolean | undefined>) {
  const cwd = process.cwd();
  const cfgPath = findConfig(cwd);
  const cfg: SeedmintConfig = cfgPath ? await loadConfig(cfgPath) : {};

  const schemaPath = positional ?? cfg.schema;
  if (!schemaPath) throw new Error(`No schema given. Pass a file or run "seedmint init" (looks for ${CONFIG_NAMES[0]}).`);
  const abs = schemaPath === "-" ? undefined : resolve(cwd, schemaPath);
  let src: string;
  let folderFormat: InputFormat | undefined;
  if (abs && statSync(abs).isDirectory()) {
    const got = collectSchemaSource(readFolder(abs));
    src = got.source;
    folderFormat = got.format;
    console.error(`Read ${got.used.length} ${got.format} file(s) from ${schemaPath}`);
  } else {
    src = readFileSync(abs ?? 0, "utf8");
  }

  const format = ((v.format as string | undefined) ?? cfg.format ?? "json") as OutputFormat;
  if (!OUTPUT_FORMATS.includes(format)) throw new Error(`Unknown format "${format}". Use: ${OUTPUT_FORMATS.join(", ")}`);
  const locale = (v.locale as string | undefined) ?? cfg.locale ?? "en";
  const seed = v.seed !== undefined ? Number(v.seed) : cfg.seed ?? 42;

  const schema = parseSchema(src, (v.from as InputFormat | undefined) ?? folderFormat ?? cfg.from);
  const data = mint({
    schema,
    locale,
    rows: parseRows(v.rows as string | undefined) ?? cfg.rows ?? 20,
    seed,
    edgeCases: (v["edge-cases"] as boolean | undefined) || cfg.edgeCases,
  });
  const files = render(data, format, schema, { locale, seed });

  const out = (v.out as string | undefined) ?? cfg.out;
  if (!out) {
    for (const f of files) {
      if (files.length > 1) process.stdout.write(`# ${f.name}\n`);
      process.stdout.write(f.content);
    }
    return;
  }
  const target = resolve(cwd, out);
  if (extname(out) && files.length === 1) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, files[0].content);
    console.error(`Wrote ${out}`);
  } else {
    mkdirSync(target, { recursive: true });
    for (const f of files) writeFileSync(join(target, f.name), f.content);
    console.error(`Wrote ${files.length} file(s) to ${out}`);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      locale: { type: "string", short: "l" },
      rows: { type: "string", short: "n" },
      format: { type: "string", short: "f" },
      seed: { type: "string", short: "s" },
      from: { type: "string" },
      "edge-cases": { type: "boolean" },
      out: { type: "string", short: "o" },
      force: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [first, second] = positionals;
  if (values.help || first === "help") return console.log(HELP);
  if (first === "init") return init(process.cwd(), !!values.force);
  if (first === "generate") return generate(second, values);
  if (first) return generate(first, values);
  if (findConfig(process.cwd())) return generate(undefined, values);
  console.log(HELP);
}

main().catch((e) => {
  console.error(`seedmint: ${(e as Error).message}`);
  process.exit(1);
});
