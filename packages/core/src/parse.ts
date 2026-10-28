import type { Field, InputFormat, Schema } from "./types.js";
import { parseDrizzle } from "./parsers/drizzle.js";
import { parseDsl } from "./parsers/dsl.js";
import { parseJsonSchema } from "./parsers/jsonschema.js";
import { parsePrisma } from "./parsers/prisma.js";
import { parseJson } from "./parsers/json.js";
import { parseSql } from "./parsers/sql.js";
import { parseTs } from "./parsers/ts.js";
import { parseCsv } from "./parsers/csv.js";
import { parseDbml } from "./parsers/dbml.js";
import { parseGraphql } from "./parsers/graphql.js";
import { parseZod } from "./parsers/zod.js";

export function detectFormat(src: string): InputFormat {
  const s = src.trim();
  if (/create\s+table/i.test(s)) return "sql";
  if (/^\s*table\s+["`]?[\w.]+["`]?(\s+as\s+\w+)?\s*\{/im.test(s)) return "dbml";
  if (/^\s*(type|input)\s+\w+(\s+implements[^{]*)?\s*\{[^}]*:\s*\[?\w+!?\]?!?/m.test(s) && !/\b(interface|export)\b|;\s*$/m.test(s)) return "graphql";
  if (/(pg|mysql|sqlite)Table\s*\(/.test(s)) return "drizzle";
  if (/^\s*(model|enum)\s+\w+\s*\{/m.test(s) && !/\binterface\b/.test(s)) return "prisma";
  if (/z\s*\.\s*object\s*\(/.test(s)) return "zod";
  if (/^(export\s+)?(interface|type)\s+\w+/m.test(s)) return "ts";
  if (/^[[{]/.test(s)) return /"\$schema"|"properties"\s*:/.test(s) ? "jsonschema" : "json";
  if (/^\w+\s*\(.*\)\s*;?\s*$/m.test(s)) return "dsl";
  if (/^[^\n{}()]+[,;\t|][^\n{}()]+(\n|$)/.test(s) && !/\)\s*;?\s*$/m.test(s.split("\n")[0])) return "csv";
  throw new Error("Could not detect the input format. Use --from ts|zod|sql|dsl|json|dbml|graphql|csv.");
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const singular = (s: string) => (s.endsWith("ies") ? s.slice(0, -3) + "y" : s.endsWith("ses") ? s.slice(0, -2) : s.endsWith("s") ? s.slice(0, -1) : s);

/** Marks primary keys and links `*_id` fields to the table they point at. */
export function finalize(schema: Schema): Schema {
  const byName = new Map(schema.tables.map((t) => [singular(norm(t.name)), t]));
  for (const t of schema.tables) {
    if (!t.fields.some((f) => f.primary)) {
      const id = t.fields.find((f) => f.name.toLowerCase() === "id");
      if (id) id.primary = true;
    }
  }
  const pkOf = (name: string) => schema.tables.find((t) => norm(t.name) === norm(name))?.fields.find((f) => f.primary);
  for (const t of schema.tables) {
    for (const f of t.fields as Field[]) {
      if (f.ref) {
        const target = schema.tables.find((x) => norm(x.name) === norm(f.ref!.table));
        if (!target) f.ref = undefined;
        else f.ref = { table: target.name, field: f.ref.field || pkOf(target.name)?.name || "id" };
        continue;
      }
      if (f.primary) continue;
      const m = f.name.match(/^(.+?)(?:_id|Id)$/);
      if (!m) continue;
      const target = byName.get(singular(norm(m[1])));
      const pk = target?.fields.find((x) => x.primary);
      if (target && pk && target !== t) f.ref = { table: target.name, field: pk.name };
    }
  }
  return schema;
}

export function parseSchema(src: string, from?: InputFormat): Schema {
  const format = from ?? detectFormat(src);
  const parsers = {
    ts: parseTs, zod: parseZod, sql: parseSql, dsl: parseDsl, json: (s: string) => parseJson(s),
    prisma: parsePrisma, drizzle: parseDrizzle, jsonschema: parseJsonSchema, dbml: parseDbml, graphql: parseGraphql, csv: (s: string) => parseCsv(s),
  };
  const schema = finalize(parsers[format](src));
  if (!schema.tables.length) throw new Error(`No tables found in ${format} input.`);
  return schema;
}
