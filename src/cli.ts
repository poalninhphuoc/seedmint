#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { OUTPUT_FORMATS, SUPPORTED_LOCALES, mint, parseSchema, render, type InputFormat, type OutputFormat } from "./index.js";

const HELP = `seedmint: realistic sample data from a pasted schema

Usage:
  seedmint <file|-> [options]        read a schema file (or stdin with "-")

Options:
  -l, --locale <codes>   comma list, e.g. vi,en (default en). Supported: ${SUPPORTED_LOCALES.join(", ")}
  -n, --rows <n|t=n,..>  rows per table, e.g. 50 or users=50,orders=200 (default 20)
  -f, --format <fmt>     ${OUTPUT_FORMATS.join(" | ")} (default json)
  -s, --seed <n>         seed for repeatable output (default 42)
      --from <fmt>       force input format: ts | zod | sql | dsl | json
      --edge-cases       sprinkle empty / long / emoji / quote / RTL strings
  -o, --out <dir>        write files into a directory instead of stdout
  -h, --help
`;

function parseRows(v: string | undefined): number | Record<string, number> {
  if (!v) return 20;
  if (/^\d+$/.test(v)) return Number(v);
  const map: Record<string, number> = {};
  for (const part of v.split(",")) {
    const [k, n] = part.split("=");
    map[k.trim()] = Number(n);
  }
  return map;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      locale: { type: "string", short: "l", default: "en" },
      rows: { type: "string", short: "n" },
      format: { type: "string", short: "f", default: "json" },
      seed: { type: "string", short: "s", default: "42" },
      from: { type: "string" },
      "edge-cases": { type: "boolean", default: false },
      out: { type: "string", short: "o" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || !positionals.length) {
    console.log(HELP);
    return;
  }
  const format = values.format as OutputFormat;
  if (!OUTPUT_FORMATS.includes(format)) throw new Error(`Unknown format "${format}". Use: ${OUTPUT_FORMATS.join(", ")}`);

  const file = positionals[0];
  const src = readFileSync(file === "-" ? 0 : file, "utf8");
  const schema = parseSchema(src, values.from as InputFormat | undefined);
  const data = mint({
    schema,
    locale: values.locale,
    rows: parseRows(values.rows),
    seed: Number(values.seed),
    edgeCases: values["edge-cases"],
  });
  const files = render(data, format, schema);

  if (values.out) {
    mkdirSync(values.out, { recursive: true });
    for (const f of files) writeFileSync(join(values.out, f.name), f.content);
    console.error(`Wrote ${files.length} file(s) to ${values.out}`);
    return;
  }
  for (const f of files) {
    if (files.length > 1) process.stdout.write(`# ${f.name}\n`);
    process.stdout.write(f.content);
  }
}

try {
  main();
} catch (e) {
  console.error(`seedmint: ${(e as Error).message}`);
  process.exit(1);
}
