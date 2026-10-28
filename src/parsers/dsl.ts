import type { Field, FieldKind, Schema } from "../types.js";
import { splitTop } from "./util.js";

const KIND: Record<string, FieldKind> = {
  string: "string", text: "string", int: "integer", integer: "integer", number: "number",
  float: "number", decimal: "number", bool: "boolean", boolean: "boolean", date: "date",
  datetime: "datetime", timestamp: "datetime", uuid: "uuid", json: "json",
};

/** One table per line: `users(name, email, phone?, age:int, avatar:image)` */
export function parseDsl(src: string): Schema {
  const tables = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.trim().match(/^(\w+)\s*\((.*)\)\s*;?$/);
    if (!m) continue;
    const fields: Field[] = splitTop(m[2]).map((raw) => {
      const optional = /\?$/.test(raw.trim());
      const [name, type] = raw.trim().replace(/\?$/, "").split(":").map((s) => s.trim());
      const field: Field = { name, kind: "string", optional: optional || undefined };
      if (type) {
        const kind = KIND[type.toLowerCase()];
        if (kind) field.kind = kind;
        else field.hint = type.toLowerCase();
      }
      return field;
    });
    if (!fields.some((f) => f.name.toLowerCase() === "id")) fields.unshift({ name: "id", kind: "integer", primary: true });
    tables.push({ name: m[1], fields });
  }
  return { tables };
}
