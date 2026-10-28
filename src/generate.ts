import type { Faker } from "@faker-js/faker";
import { inferSemantic, type Semantic } from "./infer.js";
import { resolveLocales, type LocaleDef } from "./locales.js";
import type { Dataset, Field, Row, Schema, Table } from "./types.js";

export interface MintOptions {
  schema: Schema;
  /** One code or a list; rows rotate through the list to mix locales. */
  locale?: string | string[];
  /** Rows per table: one number for all, or `{ users: 50, "*": 10 }`. */
  rows?: number | Record<string, number>;
  seed?: number;
  /** Occasionally emit awkward strings (empty, very long, emoji, quotes, RTL). */
  edgeCases?: boolean;
  /** Reference "now" for relative dates. Defaults to the start of today (UTC), so output is stable within a day. */
  now?: Date;
}

const EDGE = ["", "A".repeat(180), "😀 Emoji 🎉", "<script>alert(1)</script>", `O'Brien "quoted"`, "  padded  ", "مرحبا بالعالم", "Line one\nLine two"];
const STATUS = ["active", "pending", "inactive", "archived"];
const ROLES = ["admin", "editor", "member", "viewer"];

function rowCount(rows: MintOptions["rows"], table: string): number {
  if (typeof rows === "number") return rows;
  return rows?.[table] ?? rows?.["*"] ?? 20;
}

function sortTables(schema: Schema): Table[] {
  const done = new Set<string>();
  const out: Table[] = [];
  const pending = [...schema.tables];
  while (pending.length) {
    const i = pending.findIndex((t) =>
      t.fields.every((f) => !f.ref || f.ref.table === t.name || done.has(f.ref.table)),
    );
    const [t] = pending.splice(i < 0 ? 0 : i, 1);
    done.add(t.name);
    out.push(t);
  }
  return out;
}

function round(n: number, step: number): number {
  const v = Math.round(n / step) * step;
  return step < 1 ? Number(v.toFixed(2)) : v;
}

function value(sem: Semantic, f: Field, l: LocaleDef, i: number, refDate: Date): unknown {
  const fk = l.faker;
  const c = l.custom;
  const day = (d: Date) => (f.kind === "date" ? d.toISOString().slice(0, 10) : d.toISOString());
  switch (sem) {
    case "id": return i + 1;
    case "uuid": return fk.string.uuid();
    case "enum": return fk.helpers.arrayElement(f.enumValues!);
    case "bool": return fk.datatype.boolean();
    case "flag": return fk.datatype.boolean({ probability: 0.8 });
    case "json": return {};
    case "email": return fk.internet.email({ provider: "example.com" }).toLowerCase();
    case "phone": return c.phone ? c.phone(fk) : fk.phone.number();
    case "firstName": return fk.person.firstName();
    case "lastName": return fk.person.lastName();
    case "fullName": return fk.person.fullName();
    case "companyName": return fk.company.name();
    case "productName": return fk.commerce.productName();
    case "categoryName": return fk.commerce.department();
    case "username": return fk.internet.username().toLowerCase();
    case "password": return fk.string.hexadecimal({ length: 60, prefix: "$2b$10$", casing: "lower" });
    case "image": return `https://picsum.photos/seed/${fk.string.alphanumeric(8)}/640/480`;
    case "avatar": return `https://i.pravatar.cc/150?img=${fk.number.int({ min: 1, max: 70 })}`;
    case "url": return fk.internet.url();
    case "street": return c.street ? c.street(fk) : fk.location.streetAddress();
    case "address": return c.address ? c.address(fk) : `${fk.location.streetAddress()}, ${fk.location.city()}`;
    case "city": return c.city ? c.city(fk) : fk.location.city();
    case "province": return c.province ? c.province(fk) : fk.location.state();
    case "country": return fk.location.country();
    case "zip": return c.zip ? c.zip(fk) : fk.location.zipCode();
    case "jobTitle": return fk.person.jobTitle();
    case "title": return c.sentence ? c.sentence(fk).replace(/[.]$/, "") : fk.lorem.sentence({ min: 3, max: 7 }).replace(/[.]$/, "");
    case "paragraph": return c.paragraph ? c.paragraph(fk) : fk.lorem.paragraph({ min: 1, max: 3 });
    case "sentence": return c.sentence ? c.sentence(fk) : fk.lorem.sentence();
    case "slug": return fk.lorem.slug(3);
    case "color": return fk.color.rgb();
    case "ip": return fk.internet.ipv4();
    case "currencyCode": return l.currency;
    case "lat": return fk.location.latitude();
    case "lng": return fk.location.longitude();
    case "sku": return fk.string.alphanumeric({ length: 8, casing: "upper" });
    case "nationalId": return c.nationalId ? c.nationalId(fk) : fk.string.numeric({ length: 12 });
    case "taxCode": return c.taxCode ? c.taxCode(fk) : fk.string.numeric({ length: 10 });
    case "plate": return c.plate ? c.plate(fk) : fk.vehicle.vrm();
    case "gender": return fk.helpers.arrayElement(["male", "female"]);
    case "status": return fk.helpers.arrayElement(STATUS);
    case "role": return fk.helpers.arrayElement(ROLES);
    case "language": return l.code;
    case "word": return fk.lorem.words({ min: 1, max: 3 });
    case "money": {
      const [min, max, step] = l.money;
      const v = round(fk.number.float({ min, max }), step);
      return f.kind === "integer" ? Math.round(v) : v;
    }
    case "rating": return fk.number.float({ min: 1, max: 5, fractionDigits: 1 });
    case "age": return fk.number.int({ min: 18, max: 70 });
    case "quantity": return fk.number.int({ min: 0, max: 100 });
    case "percent": return fk.number.int({ min: 0, max: 100 });
    case "year": return fk.number.int({ min: 2000, max: 2026 });
    case "int": return fk.number.int({ min: 1, max: 1000 });
    case "float": return fk.number.float({ min: 0, max: 1000, fractionDigits: 2 });
    case "birthdate": return day(fk.date.birthdate({ min: 18, max: 65, mode: "age", refDate }));
    case "createdAt": return day(fk.date.recent({ days: 90, refDate }));
    case "updatedAt": return day(fk.date.recent({ days: 30, refDate }));
    case "future": return day(fk.date.soon({ days: 120, refDate }));
    case "anyDate": return day(fk.date.recent({ days: 365, refDate }));
  }
}

/** Generates a dataset: parents first, foreign keys point at real rows, output is repeatable per seed. */
export function mint(opts: MintOptions): Dataset {
  const locales = resolveLocales(opts.locale ?? "en");
  const seed = opts.seed ?? 42;
  const refDate = opts.now ?? new Date(new Date().toISOString().slice(0, 10));
  locales.forEach((l, i) => l.faker.seed(seed + i));
  const main: Faker = locales[0].faker;
  const data: Dataset = {};
  const seen = new Map<string, Set<unknown>>();

  for (const table of sortTables(opts.schema)) {
    const rows: Row[] = [];
    const count = rowCount(opts.rows, table.name);
    const sems = table.fields.map((f) => inferSemantic(table.name, f));

    for (let i = 0; i < count; i++) {
      const l = locales[i % locales.length];
      const row: Row = {};
      table.fields.forEach((f, k) => {
        const sem = sems[k];
        if (f.ref) {
          const parents = data[f.ref.table] ?? (f.ref.table === table.name ? rows : []);
          const target = parents.length ? main.helpers.arrayElement(parents) : undefined;
          row[f.name] = target ? target[f.ref.field] ?? null : null;
          if (f.optional && main.number.float() < 0.1) row[f.name] = null;
          return;
        }
        if (f.optional && !f.primary && main.number.float() < 0.1) {
          row[f.name] = null;
          return;
        }
        let v = value(sem, f, l, i, refDate);
        if (sem === "email" || sem === "username") {
          const key = `${table.name}.${f.name}`;
          const set = seen.get(key) ?? new Set();
          seen.set(key, set);
          if (set.has(v)) v = String(v).replace(/(@|$)/, `${i + 1}$1`);
          set.add(v);
        }
        if (opts.edgeCases && typeof v === "string" && ["fullName", "title", "word", "paragraph", "productName", "companyName"].includes(sem) && main.number.float() < 0.08) {
          v = main.helpers.arrayElement(EDGE);
        }
        row[f.name] = v;
      });
      const created = table.fields.findIndex((_, k) => sems[k] === "createdAt");
      const updated = table.fields.findIndex((_, k) => sems[k] === "updatedAt");
      if (created >= 0 && updated >= 0) {
        const c = row[table.fields[created].name], u = row[table.fields[updated].name];
        if (typeof c === "string" && typeof u === "string" && u < c) row[table.fields[updated].name] = c;
      }
      rows.push(row);
    }
    data[table.name] = rows;
  }
  return data;
}
