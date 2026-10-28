import { parse as parseYaml } from "yaml";
import type { Field, Schema, Table } from "../types.js";
import { fieldOf, type JS } from "./jsonschema.js";

type OA = JS & {
  $ref?: string;
  allOf?: OA[];
  properties?: Record<string, OA>;
  items?: OA;
  components?: { schemas?: Record<string, OA> };
  definitions?: Record<string, OA>;
};

/** Parses an OpenAPI 3.x or Swagger 2.0 document (JSON or YAML): one table per object schema in `components.schemas` / `definitions`. */
export function parseOpenapi(src: string): Schema {
  const doc = parseYaml(src) as OA | null;
  const defs = doc?.components?.schemas ?? doc?.definitions ?? {};
  if (!doc || typeof doc !== "object" || !Object.keys(defs).length) return { tables: [] };

  const refName = (ref?: string) => ref?.match(/^#\/(?:components\/schemas|definitions)\/(.+)$/)?.[1];
  const resolve = (s: OA, seen = new Set<string>()): OA => {
    const name = refName(s.$ref);
    if (name && defs[name] && !seen.has(name)) return resolve(defs[name], new Set(seen).add(name));
    if (!s.allOf) return s;
    const merged: OA = { ...s, properties: { ...s.properties }, required: [...(s.required ?? [])] };
    for (const part of s.allOf) {
      const r = resolve(part, seen);
      Object.assign(merged.properties!, r.properties);
      merged.required!.push(...(r.required ?? []));
      merged.type ??= r.type;
    }
    delete merged.allOf;
    return merged;
  };
  const isTable = (s: OA) => !!s.properties && (s.type === undefined || s.type === "object");

  const tables: Table[] = [];
  for (const [name, def] of Object.entries(defs)) {
    const obj = resolve(def);
    if (!isTable(obj)) continue;
    const req = new Set(obj.required ?? []);
    const fields: Field[] = [];
    for (const [key, raw] of Object.entries(obj.properties!)) {
      const prop = resolve(raw);
      // Nested objects are skipped: the sibling `xId` scalar carries the link, as in the GraphQL parser.
      if (isTable(prop)) continue;
      const field = fieldOf(key, prop, req.has(key));
      if (field.kind === "json" && raw.$ref && !prop.type && !prop.enum) continue;
      fields.push(field);
    }
    tables.push({ name, fields });
  }
  return { tables };
}
