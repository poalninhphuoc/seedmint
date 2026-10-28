import type { Field, FieldKind, Schema, Table } from "../types.js";
import { readBalanced, splitTop, stripComments, unquote } from "./util.js";

const KIND: Record<string, FieldKind> = {
  serial: "integer", bigserial: "integer", smallserial: "integer", integer: "integer", int: "integer",
  bigint: "integer", smallint: "integer", tinyint: "integer", mediumint: "integer",
  text: "string", varchar: "string", char: "string", mediumtext: "string", longtext: "string", tinytext: "string",
  boolean: "boolean", timestamp: "datetime", datetime: "datetime", date: "date", time: "string",
  uuid: "uuid", json: "json", jsonb: "json",
  numeric: "number", decimal: "number", real: "number", doublePrecision: "number", double: "number", float: "number",
};

/** Parses `pgTable` / `mysqlTable` / `sqliteTable` definitions. Field names are the JS keys, table names the exported variables. */
export function parseDrizzle(src: string): Schema {
  const code = stripComments(src);
  const enums = new Map<string, string[]>();
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:pg|mysql)Enum\s*\(\s*["'][^"']+["']\s*,\s*\[([^\]]*)\]/g)) {
    enums.set(m[1], splitTop(m[2]).map(unquote));
  }

  const tables: Table[] = [];
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*(?:pg|mysql|sqlite)Table\s*\(\s*["'][^"']+["']\s*,\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const { inner } = readBalanced(code, re.lastIndex - 1);
    const fields: Field[] = [];
    for (const entry of splitTop(inner)) {
      const colon = entry.indexOf(":");
      if (colon < 0) continue;
      const key = unquote(entry.slice(0, colon));
      const expr = entry.slice(colon + 1).trim();
      const fn = expr.match(/^(\w+)\s*\(/)?.[1];
      if (!fn) continue;

      const field: Field = { name: key, kind: KIND[fn] ?? "string" };
      if (enums.has(fn)) {
        field.kind = "enum";
        field.enumValues = enums.get(fn);
      } else if (fn === "mysqlEnum" || fn === "pgEnum") {
        const em = expr.match(/\[([^\]]*)\]/);
        field.kind = "enum";
        field.enumValues = em ? splitTop(em[1]).map(unquote) : [];
      } else {
        const inline = expr.match(/enum\s*:\s*\[([^\]]*)\]/);
        if (inline) {
          field.kind = "enum";
          field.enumValues = splitTop(inline[1]).map(unquote);
        }
      }
      if (fn === "integer" && /mode\s*:\s*["']boolean["']/.test(expr)) field.kind = "boolean";
      if (/\.primaryKey\s*\(/.test(expr)) field.primary = true;
      if (!/\.notNull\s*\(/.test(expr) && !field.primary) field.optional = true;
      const ref = expr.match(/\.references\s*\(\s*\(\s*\)\s*=>\s*(\w+)\.(\w+)/);
      if (ref) field.ref = { table: ref[1], field: ref[2] };
      fields.push(field);
    }
    tables.push({ name: m[1], fields });
  }
  return { tables };
}
