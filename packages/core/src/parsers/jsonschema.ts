import type { Field, FieldKind, Schema, Table } from "../types.js";

export type JS = {
  nullable?: boolean;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  properties?: Record<string, JS>;
  required?: string[];
  items?: JS;
  title?: string;
  $defs?: Record<string, JS>;
  definitions?: Record<string, JS>;
};

const FORMAT_HINT: Record<string, string> = { email: "email", uri: "url", url: "url", "idn-email": "email", hostname: "url" };

export function fieldOf(name: string, p: JS, required: boolean): Field {
  const types = Array.isArray(p.type) ? p.type : [p.type];
  const nullable = types.includes("null") || p.nullable === true;
  const type = types.find((t) => t && t !== "null");
  let kind: FieldKind = "json";
  const field: Field = { name, kind, optional: !required || nullable || undefined };
  if (p.enum?.length && p.enum.every((v) => typeof v === "string")) {
    field.kind = "enum";
    field.enumValues = p.enum as string[];
    return field;
  }
  if (type === "string") {
    kind = "string";
    if (p.format === "uuid") kind = "uuid";
    else if (p.format === "date-time") kind = "datetime";
    else if (p.format === "date") kind = "date";
    else if (p.format && FORMAT_HINT[p.format]) field.hint = FORMAT_HINT[p.format];
  } else if (type === "integer") kind = "integer";
  else if (type === "number") kind = "number";
  else if (type === "boolean") kind = "boolean";
  field.kind = kind;
  return field;
}

function tableOf(name: string, schema: JS): Table | undefined {
  const obj = schema.type === "array" && schema.items ? schema.items : schema;
  if (!obj.properties) return undefined;
  const req = new Set(obj.required ?? []);
  return { name, fields: Object.entries(obj.properties).map(([k, v]) => fieldOf(k, v, req.has(k))) };
}

/** One table for the root object (or array items), plus one per `$defs`/`definitions` object. */
export function parseJsonSchema(src: string): Schema {
  const root = JSON.parse(src) as JS;
  const tables: Table[] = [];
  const main = tableOf(root.title?.replace(/\W+/g, "_") || "items", root);
  if (main) tables.push(main);
  for (const [name, def] of Object.entries({ ...root.definitions, ...root.$defs })) {
    const t = tableOf(name, def);
    if (t) tables.push(t);
  }
  return { tables };
}
