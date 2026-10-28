import type { Field, FieldKind, Schema, Table } from "../types.js";
import { readBalanced, splitTop, stripComments, unquote } from "./util.js";

/** Removes everything inside parentheses so only the method chain remains. */
function chainOnly(expr: string): string {
  let depth = 0;
  let out = "";
  for (const c of expr) {
    if (c === "(") {
      if (depth === 0) out += "(";
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) out += ")";
    } else if (depth === 0) out += c;
  }
  return out;
}

function parseField(key: string, rawExpr: string): Field {
  const expr = rawExpr.replace(/z\s*\.\s*coerce\s*\./g, "z.").replace(/\s+/g, " ");
  const chain = chainOnly(expr);
  const methods = [...chain.matchAll(/\.\s*(\w+)\s*\(/g)].map((m) => m[1]);
  const base = methods[0] ?? "string";
  const has = (n: string) => methods.includes(n);
  const field: Field = { name: key, kind: "string" };

  const kinds: Record<string, FieldKind> = {
    string: "string",
    number: "number",
    bigint: "integer",
    boolean: "boolean",
    date: "datetime",
    enum: "enum",
    nativeEnum: "enum",
  };
  field.kind = kinds[base] ?? "json";

  if (base === "enum") {
    const m = expr.match(/enum\s*\(\s*\[([^\]]*)\]/);
    if (m) field.enumValues = splitTop(m[1]).map(unquote);
  }
  if (has("int")) field.kind = "integer";
  if (field.kind === "string") {
    if (has("uuid")) field.kind = "uuid";
    else if (has("datetime")) field.kind = "datetime";
    else if (has("email")) field.hint = "email";
    else if (has("url")) field.hint = "url";
  }
  if (has("optional") || has("nullable") || has("nullish")) field.optional = true;
  return field;
}

export function parseZod(src: string): Schema {
  const code = stripComments(src);
  const tables: Table[] = [];
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*z\s*\.\s*object\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const { inner } = readBalanced(code, re.lastIndex - 1);
    const fields: Field[] = [];
    for (const entry of splitTop(inner)) {
      const colon = entry.indexOf(":");
      if (colon < 0) continue;
      fields.push(parseField(unquote(entry.slice(0, colon)), entry.slice(colon + 1)));
    }
    tables.push({ name: m[1].replace(/(Schema|Validator)$/i, "") || m[1], fields });
  }
  return { tables };
}
