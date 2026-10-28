import type { Field, FieldKind, Schema, Table } from "../types.js";
import { readBalanced, stripComments } from "./util.js";

const SCALAR: Record<string, FieldKind> = {
  String: "string", Int: "integer", BigInt: "integer", Float: "number", Decimal: "number",
  Boolean: "boolean", DateTime: "datetime", Json: "json", Bytes: "string",
};

/** Parses `model` and `enum` blocks of a schema.prisma file. Relation fields are skipped; their scalar FK keeps a `ref`. */
export function parsePrisma(src: string): Schema {
  // Keep trailing `// note` on field lines as an @comment attribute so inference can read hints like "YYYY-MM-DD".
  const withNotes = src.replace(/^(\s*\w+\s+\w+(?:\[\])?\??[^\n/]*?)\s*\/\/(?!\/)\s*(.+)$/gm, (_m, head: string, note: string) =>
    `${head} @comment("${note.replace(/["\r]/g, "'").trim()}")`);
  const code = stripComments(withNotes.replace(/\/\/\/.*$/gm, ""));
  const enums = new Map<string, string[]>();
  for (const m of code.matchAll(/\benum\s+(\w+)\s*\{/g)) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    enums.set(m[1], inner.split(/\s+/).filter((v) => /^\w+$/.test(v)));
  }
  const modelNames = new Set([...code.matchAll(/\bmodel\s+(\w+)\s*\{/g)].map((m) => m[1]));

  const tables: Table[] = [];
  for (const m of code.matchAll(/\bmodel\s+(\w+)\s*\{/g)) {
    const { inner } = readBalanced(code, m.index! + m[0].length - 1);
    const fields: Field[] = [];
    const refs = new Map<string, { table: string; field: string }>();

    for (const raw of inner.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("@@")) continue;
      const parts = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
      if (!parts) continue;
      const [, name, type, list, opt, attrs] = parts;

      const rel = attrs.match(/@relation\([^)]*fields:\s*\[([^\]]*)\][^)]*references:\s*\[([^\]]*)\]/);
      if (rel) {
        const fk = rel[1].split(",")[0].trim();
        const target = rel[2].split(",")[0].trim();
        refs.set(fk, { table: type, field: target });
      }
      if (modelNames.has(type)) continue; // relation field, not a column
      if (list) {
        fields.push({ name, kind: "json", optional: true });
        continue;
      }

      const field: Field = { name, kind: SCALAR[type] ?? "string", optional: !!opt || undefined };
      if (enums.has(type)) {
        field.kind = "enum";
        field.enumValues = enums.get(type);
      }
      const note = attrs.match(/@comment\("(.*)"\)\s*$/);
      if (note) field.comment = note[1];
      if (/@id\b/.test(attrs)) field.primary = true;
      if (/@default\(\s*(uuid|cuid|nanoid)/.test(attrs) && field.kind === "string") field.kind = "uuid";
      if (/@updatedAt/.test(attrs)) field.hint = "updatedAt";
      fields.push(field);
    }
    for (const f of fields) {
      const ref = refs.get(f.name);
      if (ref) f.ref = ref;
    }
    tables.push({ name: m[1], fields });
  }
  return { tables };
}
