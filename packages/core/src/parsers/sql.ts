import type { Field, FieldKind, Schema, Table } from "../types.js";
import { readBalanced, splitTop, stripComments, unquote } from "./util.js";

const KIND: Record<string, FieldKind> = {
  int: "integer", integer: "integer", bigint: "integer", smallint: "integer", tinyint: "integer",
  mediumint: "integer", serial: "integer", bigserial: "integer", smallserial: "integer",
  decimal: "number", numeric: "number", float: "number", double: "number", real: "number", money: "number",
  bool: "boolean", boolean: "boolean", bit: "boolean",
  date: "date", timestamp: "datetime", timestamptz: "datetime", datetime: "datetime",
  uuid: "uuid", json: "json", jsonb: "json",
};

const cols = (s: string) => splitTop(s).map(unquote);

function lastIdent(name: string): string {
  return unquote(name.split(".").pop() ?? name);
}

export function parseSql(src: string): Schema {
  const code = stripComments(src);
  const tables: Table[] = [];
  const re = /create\s+(?:temporary\s+)?table\s+(?:if\s+not\s+exists\s+)?([\w."`\[\]]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const { inner } = readBalanced(code, re.lastIndex - 1);
    const fields: Field[] = [];
    const pk = new Set<string>();
    const fks: { col: string; table: string; field: string }[] = [];

    for (const entry of splitTop(inner)) {
      const upper = entry.toUpperCase();
      const pkm = entry.match(/primary\s+key\s*\(([^)]*)\)/i);
      const fkm = entry.match(/foreign\s+key\s*\(([^)]*)\)\s*references\s+([\w."`\[\]]+)\s*\(([^)]*)\)/i);
      if (fkm) {
        fks.push({ col: cols(fkm[1])[0], table: lastIdent(fkm[2]), field: cols(fkm[3])[0] });
        continue;
      }
      if (pkm && /^(CONSTRAINT|PRIMARY)/.test(upper)) {
        cols(pkm[1]).forEach((c) => pk.add(c));
        continue;
      }
      if (/^(CONSTRAINT|UNIQUE|KEY|INDEX|CHECK|FULLTEXT|EXCLUDE)\b/.test(upper)) continue;

      const head = entry.match(/^("[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s+(\w+)/);
      if (!head) continue;
      const name = unquote(head[1]);
      const type = head[2].toLowerCase();
      const field: Field = { name, kind: KIND[type] ?? "string" };

      if (type === "enum") {
        const em = entry.match(/enum\s*\(([^)]*)\)/i);
        field.kind = "enum";
        field.enumValues = em ? splitTop(em[1]).map(unquote) : [];
      }
      if (type === "tinyint" && /tinyint\s*\(\s*1\s*\)/i.test(entry)) field.kind = "boolean";
      if (/primary\s+key/i.test(entry)) pk.add(name);
      const ref = entry.match(/references\s+([\w."`\[\]]+)\s*\(([^)]*)\)/i);
      if (ref) field.ref = { table: lastIdent(ref[1]), field: cols(ref[2])[0] };
      if (!/not\s+null/i.test(entry) && !/primary\s+key/i.test(entry) && !/serial/i.test(type)) field.optional = true;
      fields.push(field);
    }
    for (const f of fields) {
      if (pk.has(f.name)) {
        f.primary = true;
        f.optional = false;
      }
      const fk = fks.find((x) => x.col === f.name);
      if (fk) f.ref = { table: fk.table, field: fk.field };
    }
    tables.push({ name: lastIdent(m[1]), fields });
  }
  return { tables };
}
