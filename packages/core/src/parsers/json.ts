import type { Field, FieldKind, Schema } from "../types.js";

const ISO = /^\d{4}-\d{2}-\d{2}T/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindOf(v: unknown): FieldKind {
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  if (typeof v === "string") return UUID.test(v) ? "uuid" : ISO.test(v) ? "datetime" : DAY.test(v) ? "date" : "string";
  return "json";
}

/** Infers one table from a sample object, or from the first object of a sample array. */
export function parseJson(src: string, tableName = "items"): Schema {
  const data = JSON.parse(src);
  const sample = Array.isArray(data) ? data[0] : data;
  if (!sample || typeof sample !== "object") return { tables: [] };
  const fields: Field[] = Object.entries(sample as Record<string, unknown>).map(([name, v]) => ({
    name,
    kind: kindOf(v),
    optional: v === null || undefined,
  }));
  return { tables: [{ name: tableName, fields }] };
}
