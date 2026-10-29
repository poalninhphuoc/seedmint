import type { Faker } from "@faker-js/faker";
import { inferSemantic, type Semantic } from "./infer.js";
import { COUNTRY, resolveLocales, type LocaleDef } from "./locales.js";
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

const snakeName = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
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

/** "maNhanVien" -> "NV", "ma_du_an" -> "DA": letters taken from the words after the leading "ma"/"code". */
function codePrefix(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_-]+/).map((w) => w.toLowerCase());
  const rest = words[0] === "ma" || words[0] === "code" ? words.slice(1) : words;
  const letters = rest.map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 3);
  return letters || "ID";
}

const addDays = (iso: string, days: number) => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  d.setUTCDate(d.getUTCDate() + days);
  return iso.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString();
};

const START = /(bat_dau|start|begin)/;
const END = /(ket_thuc|kt_|du_kien|deadline|end|due)/;

const REVIEW_TEXT = /(comment|review|feedback|binh_luan|nhan_xet|danh_gia)/;
const ORDERED = /(^|_)(ordered|placed|created|submitted|opened|booked)_(at|on|date)$|^(order|ngay_dat|ngay_tao)(_date)?$/;
const FINISHED = /(^|_)(shipped|delivered|paid|completed|closed|finished|resolved|received|approved|cancelled|canceled)_(at|on|date)$|^(ship|delivery|payment|ngay_giao|ngay_thanh_toan)(_date)?$/;

/** Lower-case ASCII words of a name: "Nguyễn Văn Đức" -> ["nguyen", "van", "duc"]. */
const words = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Makes columns of one row agree with each other: email from the name, age from the birth date,
 * province from the address, and an end date that never precedes its start date.
 */
function coherent(table: Table, sems: Semantic[], row: Row, l: LocaleDef, i: number, refDate: Date, seen: Map<string, Set<unknown>>, rng: Faker): void {
  const at = (sem: Semantic) => table.fields.findIndex((_, k) => sems[k] === sem);
  const str = (k: number) => (k >= 0 && typeof row[table.fields[k].name] === "string" ? (row[table.fields[k].name] as string) : undefined);

  const full = str(at("fullName"));
  const given = str(at("firstName")), family = str(at("lastName"));
  let tokens = full ? words(full) : [...words(given ?? ""), ...words(family ?? "")];
  // Vietnamese writes the family name first: the address-book form is "given.family".
  if (l.code === "vi" && full && tokens.length > 1) tokens = [tokens[tokens.length - 1], tokens[0]];
  else if (tokens.length > 2) tokens = [tokens[0], tokens[tokens.length - 1]];
  table.fields.forEach((f, k) => {
    if (sems[k] !== "email" || typeof row[f.name] !== "string") return;
    if (tokens.length >= 2) {
      const glue = ["." , "", "_"][i % 3];
      row[f.name] = `${tokens.join(glue)}@example.com`;
    }
  });
  table.fields.forEach((f, k) => {
    if ((sems[k] !== "email" && sems[k] !== "username") || typeof row[f.name] !== "string") return;
    const key = `${table.name}.${f.name}`;
    const set = seen.get(key) ?? new Set();
    seen.set(key, set);
    let v = row[f.name] as string;
    if (set.has(v)) v = v.replace(/(@|$)/, `${i + 1}$1`);
    set.add(v);
    row[f.name] = v;
  });

  // A slug is the name it belongs to, without accents: "Áo thun cao cấp" -> "ao-thun-cao-cap".
  const titleK = table.fields.findIndex((_, k) => ["productName", "categoryName", "title", "projectName", "companyName"].includes(sems[k]) && typeof row[table.fields[k].name] === "string");
  if (titleK >= 0) {
    const base = words(row[table.fields[titleK].name] as string).join("-");
    table.fields.forEach((f, k) => {
      if (sems[k] !== "slug" || typeof row[f.name] !== "string" || !base) return;
      const key = `${table.name}.${f.name}`;
      const set = seen.get(key) ?? new Set();
      seen.set(key, set);
      row[f.name] = set.has(base) ? `${base}-${i + 1}` : base;
      set.add(row[f.name]);
    });
  }

  // Review text agrees with its star rating.
  const stars = row[table.fields[at("rating")]?.name ?? ""];
  if (l.custom.review)
    table.fields.forEach((f, k) => {
      if ((sems[k] !== "paragraph" && sems[k] !== "sentence") || !REVIEW_TEXT.test(snakeName(f.name)) || typeof row[f.name] !== "string") return;
      row[f.name] = l.custom.review!(rng, typeof stars === "number" ? stars : null);
    });

  const born = str(at("birthdate")), ageK = at("age");
  if (born && ageK >= 0 && row[table.fields[ageK].name] !== null) {
    const b = new Date(born);
    let age = refDate.getUTCFullYear() - b.getUTCFullYear();
    if (refDate.getUTCMonth() < b.getUTCMonth() || (refDate.getUTCMonth() === b.getUTCMonth() && refDate.getUTCDate() < b.getUTCDate())) age--;
    row[table.fields[ageK].name] = age;
  }

  const addr = str(at("address"));
  if (l.code === "vi" && addr) {
    const province = addr.split(",").pop()!.trim();
    table.fields.forEach((f, k) => {
      if ((sems[k] === "province" || sems[k] === "city") && typeof row[f.name] === "string") row[f.name] = province;
    });
  }

  const isDate = (k: number) => table.fields[k].kind === "date" || table.fields[k].kind === "datetime";
  const startK = table.fields.findIndex((f, k) => isDate(k) && ORDERED.test(snakeName(f.name)));
  table.fields.forEach((f, k) => {
    if (startK < 0 || k === startK || !isDate(k) || !FINISHED.test(snakeName(f.name))) return;
    const a = row[table.fields[startK].name], b = row[f.name];
    if (typeof a === "string" && typeof b === "string" && b < a) {
      const end = addDays(a, rng.number.int({ min: 1, max: 14 }));
      row[f.name] = end > refDate.toISOString() ? a : end;
    }
  });
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
    case "firstName": return c.firstName ? c.firstName(fk) : fk.person.firstName();
    case "lastName": return c.lastName ? c.lastName(fk) : fk.person.lastName();
    case "fullName": return c.fullName ? c.fullName(fk) : fk.person.fullName();
    case "companyName": return fk.company.name();
    case "productName": return c.productName ? c.productName(fk) : fk.commerce.productName();
    case "categoryName": return c.categoryName ? c.categoryName(fk) : fk.commerce.department();
    case "username": return fk.internet.username().toLowerCase();
    case "password": return fk.string.hexadecimal({ length: 60, prefix: "$2b$10$", casing: "lower" });
    case "image": return `https://picsum.photos/seed/${fk.string.alphanumeric(8)}/640/480`;
    case "avatar": return `https://i.pravatar.cc/150?img=${fk.number.int({ min: 1, max: 70 })}`;
    case "url": return fk.internet.url();
    case "street": return c.street ? c.street(fk) : fk.location.streetAddress();
    case "address": return c.address ? c.address(fk) : `${fk.location.streetAddress()}, ${fk.location.city()}`;
    case "city": return c.city ? c.city(fk) : fk.location.city();
    case "province": return c.province ? c.province(fk) : fk.location.state();
    case "country": return COUNTRY[l.code] ?? fk.location.country();
    case "zip": return c.zip ? c.zip(fk) : fk.location.zipCode();
    case "jobTitle": return fk.person.jobTitle();
    case "title": return c.sentence ? c.sentence(fk).replace(/[.]$/, "") : fk.lorem.sentence({ min: 3, max: 7 }).replace(/[.]$/, "");
    case "paragraph": return c.paragraph ? c.paragraph(fk) : fk.lorem.paragraph({ min: 1, max: 3 });
    case "sentence": return c.sentence ? c.sentence(fk) : fk.lorem.sentence();
    case "slug": return fk.lorem.slug(3);
    case "color": return fk.color.rgb();
    case "ip": return fk.internet.ipv4();
    case "currencyCode": return l.currency;
    case "lat": return c.lat ? c.lat(fk) : fk.location.latitude();
    case "lng": return c.lng ? c.lng(fk) : fk.location.longitude();
    case "sku": return fk.string.alphanumeric({ length: 8, casing: "upper" });
    case "nationalId": return c.nationalId ? c.nationalId(fk) : fk.string.numeric({ length: 12 });
    case "taxCode": return c.taxCode ? c.taxCode(fk) : fk.string.numeric({ length: 10 });
    case "plate": return c.plate ? c.plate(fk) : fk.vehicle.vrm();
    case "gender": return fk.helpers.arrayElement(["male", "female"]);
    case "status": return c.status ? c.status(fk) : fk.helpers.arrayElement(STATUS);
    case "role": return fk.helpers.arrayElement(ROLES);
    case "language": return l.code;
    case "word": return c.word ? c.word(fk) : fk.lorem.words({ min: 1, max: 3 });
    case "count": return fk.number.float() < 0.3 ? 0 : fk.number.int({ min: 1, max: 20 });
    case "code": return `${codePrefix(f.name)}-${String(i + 1).padStart(4, "0")}`;
    case "stage": return c.stage ? c.stage(fk) : fk.helpers.arrayElement(["Survey", "Design", "Build", "Acceptance", "Maintenance"]);
    case "dateStr": return fk.date.recent({ days: 60, refDate }).toISOString().slice(0, 10);
    case "timeStr": return `${String(fk.number.int({ min: 6, max: 21 })).padStart(2, "0")}:${String(fk.number.int({ min: 0, max: 59 })).padStart(2, "0")}:00`;
    case "projectName": return c.project ? c.project(fk) : `${fk.company.buzzAdjective()} ${fk.commerce.department()} project`;
    case "teamName": return c.team ? c.team(fk) : `Team ${fk.number.int({ min: 1, max: 12 })}`;
    case "shift": return c.shift ? c.shift(fk) : fk.helpers.arrayElement(["Morning", "Afternoon", "Night"]);
    case "money": {
      const [min, max, step] = l.money;
      const v = round(fk.number.float({ min, max }), step);
      return f.kind === "integer" ? Math.round(v) : v;
    }
    case "rating": return f.kind === "integer" ? fk.number.int({ min: 1, max: 5 }) : fk.number.int({ min: 2, max: 10 }) / 2;
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
      // Columns of one composite foreign key share a single parent row (and a single null decision).
      const picked = new Map<string, { target?: Row; none: boolean }>();
      table.fields.forEach((f, k) => {
        const sem = sems[k];
        if (f.ref) {
          const shared = f.ref.group ? picked.get(f.ref.group) : undefined;
          if (shared) {
            row[f.name] = shared.none || !shared.target ? null : shared.target[f.ref.field] ?? null;
            return;
          }
          const parents = data[f.ref.table] ?? (f.ref.table === table.name ? rows : []);
          const target = parents.length ? main.helpers.arrayElement(parents) : undefined;
          row[f.name] = target ? target[f.ref.field] ?? null : null;
          const none = !!f.optional && main.number.float() < 0.1;
          if (none) row[f.name] = null;
          if (f.ref.group) picked.set(f.ref.group, { target, none });
          return;
        }
        if (f.optional && !f.primary && main.number.float() < 0.1) {
          row[f.name] = null;
          return;
        }
        let v = value(sem, f, l, i, refDate);
        if (opts.edgeCases && typeof v === "string" && ["fullName", "title", "word", "paragraph", "productName", "companyName"].includes(sem) && main.number.float() < 0.08) {
          v = main.helpers.arrayElement(EDGE);
        }
        row[f.name] = v;
      });
      coherent(table, sems, row, l, i, refDate, seen, main);
      // An end date never comes before its start date.
      const dateField = (re: RegExp) => table.fields.find((f, k) => (f.kind === "date" || f.kind === "datetime" || sems[k] === "dateStr" || sems[k] === "future") && re.test(snakeName(f.name)));
      const startF = dateField(START), endF = dateField(END);
      if (startF && endF && startF !== endF) {
        const a = row[startF.name], b = row[endF.name];
        if (typeof a === "string" && typeof b === "string" && b < a) row[endF.name] = addDays(a, main.number.int({ min: 7, max: 180 }));
      }
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
