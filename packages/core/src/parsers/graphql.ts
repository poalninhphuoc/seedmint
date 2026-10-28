import type { Field, FieldKind, Schema } from "../types.js";
import { readBalanced } from "./util.js";

const SCALAR: Record<string, FieldKind> = {
  String: "string", Int: "integer", Float: "number", Boolean: "boolean", ID: "uuid",
  DateTime: "datetime", Date: "date", JSON: "json", JSONObject: "json", BigInt: "integer", UUID: "uuid",
};

/** Parses `type`/`input` and `enum` definitions from GraphQL SDL. Fields that point at another type become refs. */
export function parseGraphql(src: string): Schema {
  const code = src.replace(/"""[\s\S]*?"""/g, "").replace(/#.*$/gm, "");
  const enums = new Map<string, string[]>();
  for (const m of code.matchAll(/\benum\s+(\w+)\s*\{/g)) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    enums.set(m[1], inner.split(/\s+/).filter((v) => /^\w+$/.test(v)));
  }
  const heads = [...code.matchAll(/\b(?:type|input)\s+(\w+)(?:\s+implements[^{]*)?\s*\{/g)].filter((m) => !["Query", "Mutation", "Subscription"].includes(m[1]));
  const names = new Set(heads.map((m) => m[1]));
  const schema: Schema = { tables: [] };
  for (const m of heads) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    const fields: Field[] = [];
    for (const line of inner.split(/\r?\n/)) {
      const p = line.trim().match(/^(\w+)\s*(?:\([^)]*\))?\s*:\s*(\[)?\s*(\w+)!?\s*\]?(!)?/);
      if (!p) continue;
      const [, name, list, type, req] = p;
      if (list) { fields.push({ name, kind: "json", optional: true }); continue; }
      if (names.has(type)) continue; // nested object: the scalar `xId` field carries the link
      const field: Field = { name, kind: SCALAR[type] ?? "string", optional: !req || undefined };
      if (type === "ID" && name === "id") field.primary = true;
      if (enums.has(type)) { field.kind = "enum"; field.enumValues = enums.get(type); }
      fields.push(field);
    }
    schema.tables.push({ name: m[1], fields });
  }
  return schema;
}
