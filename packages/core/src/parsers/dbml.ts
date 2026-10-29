import type { Field, FieldKind, Schema } from "../types.js";
import { readBalanced } from "./util.js";

const KIND: [RegExp, FieldKind][] = [
  [/^(u?int|integer|bigint|smallint|tinyint|serial|bigserial|mediumint)/i, "integer"],
  [/^(float|double|real|decimal|numeric|number|money)/i, "number"],
  [/^(bool|boolean)/i, "boolean"],
  [/^(timestamp|datetime)/i, "datetime"],
  [/^date$/i, "date"],
  [/^(uuid|guid)$/i, "uuid"],
  [/^(json|jsonb)$/i, "json"],
];

/** Parses `Table name { col type [pk, ref: > other.id] }` and standalone `Ref:` lines from DBML. */
export function parseDbml(src: string): Schema {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const enums = new Map<string, string[]>();
  for (const m of code.matchAll(/\benum\s+["`]?([\w.]+)["`]?\s*\{/gi)) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    enums.set(m[1], inner.split(/\r?\n/).map((l) => l.trim().split(/\s+/)[0]?.replace(/["`]/g, "")).filter(Boolean));
  }
  const schema: Schema = { tables: [] };
  for (const m of code.matchAll(/\btable\s+["`]?([\w.]+)["`]?(?:\s+as\s+\w+)?\s*\{/gi)) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    const fields: Field[] = [];
    for (const raw of inner.split(/\r?\n/)) {
      const line = raw.trim();
      const p = line.match(/^["`]?(\w+)["`]?\s+["`]?([\w.]+(?:\([^)]*\))?)["`]?\s*(?:\[(.*)\])?/);
      if (!p || /^(indexes|note)\b/i.test(line)) continue;
      const [, name, type, attrs = ""] = p;
      const field: Field = { name, kind: KIND.find(([re]) => re.test(type))?.[1] ?? "string" };
      if (enums.has(type)) { field.kind = "enum"; field.enumValues = enums.get(type); }
      if (/\bpk\b|primary key/i.test(attrs)) field.primary = true;
      if (/\bnull\b/i.test(attrs) && !/not null/i.test(attrs)) field.optional = true;
      const ref = attrs.match(/ref:\s*[<>-]\s*["`]?(\w+)["`]?\.["`]?(\w+)/i);
      if (ref) field.ref = { table: ref[1], field: ref[2] };
      fields.push(field);
    }
    const parts = m[1].split(".");
    const group = parts.length > 1 ? parts[parts.length - 2] : undefined;
    schema.tables.push(group ? { name: parts[parts.length - 1], group, fields } : { name: parts[parts.length - 1], fields });
  }
  // Ref: a.x > b.y  (many-to-one from a to b), Ref: a.x < b.y (one-to-many)
  for (const m of code.matchAll(/\bref\b[^:\n{]*:\s*["`]?(\w+)["`]?\.["`]?(\w+)["`]?\s*([<>-])\s*["`]?(\w+)["`]?\.["`]?(\w+)/gi)) {
    const [, t1, f1, op, t2, f2] = m;
    const [fromT, fromF, toT, toF] = op === "<" ? [t2, f2, t1, f1] : [t1, f1, t2, f2];
    const f = schema.tables.find((t) => t.name === fromT)?.fields.find((x) => x.name === fromF);
    if (f && !f.ref) f.ref = { table: toT, field: toF };
  }
  return schema;
}
