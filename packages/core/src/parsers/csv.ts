import type { Field, FieldKind, Schema } from "../types.js";

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function kindOf(values: string[]): FieldKind {
  const v = values.filter((x) => x !== "");
  if (!v.length) return "string";
  if (v.every((x) => /^(true|false)$/i.test(x))) return "boolean";
  if (v.every((x) => /^-?\d+$/.test(x))) return "integer";
  if (v.every((x) => /^-?\d+([.,]\d+)?$/.test(x))) return "number";
  if (v.every((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x))) return "uuid";
  if (v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) return "date";
  if (v.every((x) => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(x))) return "datetime";
  return "string";
}

/** Reads a CSV/TSV header (and a few data rows when present) as one table; column types come from the sample values. */
export function parseCsv(src: string, table = "data"): Schema {
  const lines = src.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { tables: [] };
  const sep = [",", ";", "\t", "|"].map((s) => [s, lines[0].split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const header = splitLine(lines[0], sep);
  const rows = lines.slice(1, 51).map((l) => splitLine(l, sep));
  const fields: Field[] = header.map((h, i) => {
    const name = h.replace(/^["']|["']$/g, "").trim().replace(/\s+/g, "_") || `col${i + 1}`;
    const values = rows.map((r) => r[i] ?? "");
    return { name, kind: kindOf(values), optional: values.some((x) => x === "") || undefined };
  });
  return { tables: [{ name: table, fields }] };
}
