import { describe, expect, it } from "vitest";
import { detectFormat, mint, parseSchema, render } from "../src/index.js";

const TS = `
export interface User { id: number; name: string; email: string; phone?: string; role: "admin" | "member"; createdAt: Date }
export interface Order { id: number; userId: number; total: number; status: string }
`;
const ZOD = `
const userSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  tags: z.array(z.string()),
  plan: z.enum(["free", "pro"]),
  bio: z.string().optional(),
});
`;
const SQL = `
CREATE TABLE users (id SERIAL PRIMARY KEY, full_name VARCHAR(100) NOT NULL, phone VARCHAR(20), created_at TIMESTAMP NOT NULL);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id), total NUMERIC(10,2) NOT NULL, status VARCHAR(20));
`;

describe("detectFormat", () => {
  it("detects each input", () => {
    expect(detectFormat(TS)).toBe("ts");
    expect(detectFormat(ZOD)).toBe("zod");
    expect(detectFormat(SQL)).toBe("sql");
    expect(detectFormat("users(name, email)")).toBe("dsl");
    expect(detectFormat('{"a":1}')).toBe("json");
  });
});

describe("parsers", () => {
  it("TypeScript: enums, optional, dates and relations", () => {
    const s = parseSchema(TS);
    const user = s.tables.find((t) => t.name === "User")!;
    expect(user.fields.find((f) => f.name === "role")).toMatchObject({ kind: "enum", enumValues: ["admin", "member"] });
    expect(user.fields.find((f) => f.name === "phone")?.optional).toBe(true);
    expect(user.fields.find((f) => f.name === "createdAt")?.kind).toBe("datetime");
    expect(s.tables[1].fields.find((f) => f.name === "userId")?.ref).toEqual({ table: "User", field: "id" });
  });
  it("Zod: hints, enums, optional", () => {
    const user = parseSchema(ZOD).tables[0];
    expect(user.name).toBe("user");
    expect(user.fields.find((f) => f.name === "email")?.hint).toBe("email");
    expect(user.fields.find((f) => f.name === "plan")?.enumValues).toEqual(["free", "pro"]);
    expect(user.fields.find((f) => f.name === "bio")?.optional).toBe(true);
    expect(user.fields.find((f) => f.name === "tags")?.kind).toBe("json");
  });
  it("SQL: keys and foreign keys", () => {
    const s = parseSchema(SQL);
    expect(s.tables.map((t) => t.name)).toEqual(["users", "orders"]);
    expect(s.tables[1].fields.find((f) => f.name === "user_id")?.ref).toEqual({ table: "users", field: "id" });
    expect(s.tables[0].fields[0].primary).toBe(true);
  });
  it("DSL with types and optional marker", () => {
    const f = parseSchema("users(name, phone?, age:int, avatar:image)").tables[0].fields.slice(1);
    expect(f.map((x) => x.kind)).toEqual(["string", "string", "integer", "string"]);
    expect(f[1].optional).toBe(true);
    expect(f[3].hint).toBe("image");
  });
});

describe("dsl relations", () => {
  it("adds ids and links *_id fields across tables", () => {
    const d = mint({ schema: parseSchema("posts(title, author_id)\nauthors(name)"), rows: 8, seed: 9 });
    const ids = new Set(d.authors.map((a) => a.id));
    expect(d.posts.every((p) => ids.has(p.author_id))).toBe(true);
  });
});

describe("mint", () => {
  const schema = parseSchema(SQL);
  it("is repeatable for the same seed and differs for another", () => {
    const a = mint({ schema, rows: 5, seed: 1 });
    expect(mint({ schema, rows: 5, seed: 1 })).toEqual(a);
    expect(mint({ schema, rows: 5, seed: 2 })).not.toEqual(a);
  });
  it("keeps foreign keys pointing at existing rows", () => {
    const d = mint({ schema, rows: { users: 5, orders: 30 }, seed: 3 });
    const ids = new Set(d.users.map((u) => u.id));
    expect(d.orders).toHaveLength(30);
    expect(d.orders.every((o) => ids.has(o.user_id))).toBe(true);
  });
  it("fills fields by meaning", () => {
    const d = mint({ schema: parseSchema(ZOD), rows: 10, seed: 4 });
    expect(d.user.every((u) => /@/.test(String(u.email)))).toBe(true);
    expect(d.user.every((u) => ["free", "pro"].includes(String(u.plan)))).toBe(true);
    expect(new Set(d.user.map((u) => u.email)).size).toBe(10);
  });
  it("Vietnamese locale gives VN phones and money in VND steps", () => {
    const d = mint({ schema, locale: "vi", rows: 20, seed: 5 });
    for (const u of d.users) if (u.phone) expect(String(u.phone)).toMatch(/^0[35789]\d{8}$/);
    expect(d.orders.every((o) => Number(o.total) % 1000 === 0)).toBe(true);
  });
  it("mixes locales across rows", () => {
    const d = mint({ schema: parseSchema("people(name, language)"), locale: ["vi", "ja", "en"], rows: 6, seed: 6 });
    expect(d.people.map((p) => p.language)).toEqual(["vi", "ja", "en", "vi", "ja", "en"]);
  });
  it("rejects unknown locales", () => {
    expect(() => mint({ schema, locale: "xx" })).toThrow(/Unsupported locale/);
  });
});

describe("render", () => {
  const schema = parseSchema(SQL);
  const data = mint({ schema, rows: 3, seed: 7 });
  it("outputs sql, csv, jsonl, ts and json", () => {
    expect(render(data, "sql", schema)[0].content).toMatch(/INSERT INTO "users"/);
    expect(render(data, "csv", schema).map((f) => f.name)).toEqual(["users.csv", "orders.csv"]);
    expect(render(data, "jsonl")[0].content.trim().split("\n")).toHaveLength(6);
    expect(render(data, "ts", schema)[0].content).toMatch(/export interface UsersRow/);
    expect(JSON.parse(render(data, "json")[0].content).users).toHaveLength(3);
  });
  it("escapes quotes in SQL", () => {
    const out = render({ t: [{ a: "O'Brien" }] }, "sql")[0].content;
    expect(out).toContain("'O''Brien'");
  });
});

const PRISMA = `
enum Role { ADMIN MEMBER }
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  posts     Post[]
}
model Post {
  id       String @id @default(uuid())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}
`;
const DRIZZLE = `
import { pgTable, pgEnum, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
export const roleEnum = pgEnum("role", ["admin", "member"]);
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  bio: text("bio"),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
});
`;
const JSON_SCHEMA = JSON.stringify({
  title: "Customer",
  type: "object",
  required: ["id", "email"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    plan: { type: "string", enum: ["free", "pro"] },
    age: { type: "integer" },
    joined: { type: "string", format: "date-time" },
    note: { type: ["string", "null"] },
  },
});

describe("Prisma, Drizzle and JSON Schema", () => {
  it("detects them", () => {
    expect(detectFormat(PRISMA)).toBe("prisma");
    expect(detectFormat(DRIZZLE)).toBe("drizzle");
    expect(detectFormat(JSON_SCHEMA)).toBe("jsonschema");
  });
  it("Prisma: enums, optional, uuid ids, relation FK, skips relation fields", () => {
    const s = parseSchema(PRISMA);
    const user = s.tables[0];
    expect(user.fields.map((f) => f.name)).toEqual(["id", "email", "name", "role", "createdAt"]);
    expect(user.fields.find((f) => f.name === "role")?.enumValues).toEqual(["ADMIN", "MEMBER"]);
    expect(user.fields.find((f) => f.name === "name")?.optional).toBe(true);
    expect(s.tables[1].fields[0]).toMatchObject({ kind: "uuid", primary: true });
    expect(s.tables[1].fields.find((f) => f.name === "authorId")?.ref).toEqual({ table: "User", field: "id" });
  });
  it("Drizzle: enums, notNull, references", () => {
    const s = parseSchema(DRIZZLE);
    expect(s.tables.map((t) => t.name)).toEqual(["users", "posts"]);
    expect(s.tables[0].fields.find((f) => f.name === "role")?.enumValues).toEqual(["admin", "member"]);
    expect(s.tables[0].fields.find((f) => f.name === "bio")?.optional).toBe(true);
    expect(s.tables[1].fields.find((f) => f.name === "authorId")?.ref).toEqual({ table: "users", field: "id" });
  });
  it("JSON Schema: formats, enums, required, nullable", () => {
    const t = parseSchema(JSON_SCHEMA).tables[0];
    expect(t.name).toBe("Customer");
    expect(t.fields.find((f) => f.name === "id")).toMatchObject({ kind: "uuid", optional: undefined });
    expect(t.fields.find((f) => f.name === "email")?.hint).toBe("email");
    expect(t.fields.find((f) => f.name === "plan")?.enumValues).toEqual(["free", "pro"]);
    expect(t.fields.find((f) => f.name === "joined")?.kind).toBe("datetime");
    expect(t.fields.find((f) => f.name === "note")?.optional).toBe(true);
  });
  it("generates consistent data from Prisma", () => {
    const d = mint({ schema: parseSchema(PRISMA), rows: { User: 4, Post: 12 }, seed: 11 });
    const ids = new Set(d.User.map((u) => u.id));
    expect(d.Post.every((p) => ids.has(p.authorId))).toBe(true);
    expect(d.User.every((u) => ["ADMIN", "MEMBER"].includes(String(u.role)))).toBe(true);
  });
});

describe("seed.ts and prompt outputs", () => {
  it("Prisma seed uses the client delegate and real Dates", () => {
    const schema = parseSchema(PRISMA);
    const out = render(mint({ schema, rows: 2, seed: 1 }), "prisma", schema)[0];
    expect(out.name).toBe("seed.ts");
    expect(out.content).toContain("prisma.user.createMany");
    expect(out.content).toContain("prisma.post.createMany");
    expect(out.content).toMatch(/createdAt: new Date\("/);
  });
  it("Drizzle seed inserts into schema tables", () => {
    const schema = parseSchema(DRIZZLE);
    const out = render(mint({ schema, rows: 2, seed: 1 }), "drizzle", schema)[0].content;
    expect(out).toContain("db.insert(schema.users)");
    expect(out).toContain("db.insert(schema.posts)");
  });
  it("vibe prompt contains schema, samples and instructions", () => {
    const schema = parseSchema(SQL);
    const out = render(mint({ schema, rows: 8, seed: 2, locale: "vi" }), "prompt", schema, { locale: "vi", seed: 2 })[0];
    expect(out.name).toBe("seedmint-prompt.md");
    expect(out.content).toContain("Locale: vi, seed: 2");
    expect(out.content).toContain("**orders**(");
    expect(out.content).toContain("user_id: integer -> users.id");
    expect(out.content).toContain("(5 of 8 rows)");
    expect(out.content).toContain("Instructions for the AI coding agent");
  });
});

describe("Vietnamese column names and comment hints", () => {
  const src = `
model ChamCong {
  id String @id @default(cuid())
  ngay String // YYYY-MM-DD (string để filter nhanh)
  taiKhoanId String
  maNhanVien String
  hoVaTen String
  gioVao String? // HH:mm:ss
  diaChiVao String @default("")
  viDoVao Float?
  kinhDoVao Float?
  lichSuVao String @default("")
  caLamViec String @default("")
  tenDuAn String?
  doiThiCong String?
}`;
  const row = () => mint({ schema: parseSchema(src), locale: "vi", rows: 30, seed: 3 }).ChamCong;

  it("produces dates, times, coordinates and Vietnamese text", () => {
    for (const r of row()) {
      expect(r.ngay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.taiKhoanId).toMatch(/^[0-9a-f-]{36}$/);
      if (r.gioVao !== null) expect(r.gioVao).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      if (r.viDoVao !== null) expect(r.viDoVao as number).toBeGreaterThan(8);
      if (r.viDoVao !== null) expect(r.viDoVao as number).toBeLessThan(22);
      expect(String(r.caLamViec)).toMatch(/^Ca /);
      expect(String(r.diaChiVao)).toMatch(/,/);
    }
  });

  it("never falls back to Latin lorem for Vietnamese output", () => {
    expect(JSON.stringify(row())).not.toMatch(/\b(voluptas|vociferor|advoco|tribuo)\b/);
  });
});

import { collectSchemaSource, formatDataset, regionDefaults } from "../src/index.js";

describe("folder scan", () => {
  it("joins a Prisma schema split over many files, enums included", () => {
    const got = collectSchemaSource([
      { path: "prisma/schema/_enums.prisma", content: "enum Role { ADMIN USER }" },
      { path: "prisma/schema/user.prisma", content: "model User {\n id Int @id\n role Role\n}" },
      { path: "prisma/schema/post.prisma", content: "model Post {\n id Int @id\n authorId Int\n author User @relation(fields: [authorId], references: [id])\n}" },
      { path: "node_modules/x/schema.prisma", content: "model Ignored { id Int @id }" },
      { path: "README.md", content: "# hi" },
    ]);
    expect(got.format).toBe("prisma");
    expect(got.used).toHaveLength(3);
    const schema = parseSchema(got.source, got.format);
    expect(schema.tables.map((t) => t.name).sort()).toEqual(["Post", "User"]);
    expect(schema.tables.find((t) => t.name === "User")!.fields.find((f) => f.name === "role")!.enumValues).toEqual(["ADMIN", "USER"]);
  });

  it("fails clearly when nothing matches", () => {
    expect(() => collectSchemaSource([{ path: "a.txt", content: "x" }])).toThrow(/No schema files/);
  });
});

describe("regional formats and SQL dialects", () => {
  const schema = parseSchema("orders(id, total:number, quantity:integer, placed_at:date)", "dsl");
  const data = mint({ schema, locale: "vi", rows: 3, seed: 1 });

  it("writes dates and numbers the way the region reads them", () => {
    const f = formatDataset(data, schema, regionDefaults("vi")).orders[0];
    expect(String(f.placed_at)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(String(f.total)).toMatch(/^\d{1,3}(\.\d{3})*(,\d+)?$/);
  });

  it("emits dialect specific DDL and quoting", () => {
    const my = render(data, "sql", schema, { dialect: "mysql" })[0].content;
    expect(my).toContain("CREATE TABLE IF NOT EXISTS `orders`");
    const ms = render(data, "sql", schema, { dialect: "mssql" })[0].content;
    expect(ms).toContain("IF OBJECT_ID");
    expect(ms).toContain("[orders]");
    const pg = render(data, "sql", schema, { dialect: "postgres", ddl: false })[0].content;
    expect(pg).not.toContain("CREATE TABLE");
    expect(pg).toContain('INSERT INTO "orders"');
  });

  it("uses a delimiter and BOM for CSV", () => {
    const csv = render(data, "csv", schema, { delimiter: ";", bom: true })[0].content;
    expect(csv.startsWith("﻿id;total;quantity;placed_at")).toBe(true);
  });
});

describe("project-style Vietnamese tables", () => {
  const src = `
model DuAn {
  id String @id @default(cuid())
  maDuAn String
  tenDuAn String
  khuVuc String
  giaiDoan String
  trangThai String
  soNhanSu Int
  soDiem Int
  ngayBatDau DateTime
  ktDuKien DateTime?
}`;
  const rows = () => mint({ schema: parseSchema(src), locale: "vi", rows: 40, seed: 5 }).DuAn;

  it("makes sequential codes, Vietnamese stages and small counts", () => {
    const r = rows();
    expect(r[0].maDuAn).toBe("DA-0001");
    expect(r[1].maDuAn).toBe("DA-0002");
    for (const x of r) {
      expect(["Khảo sát", "Thiết kế", "Đang thi công", "Nghiệm thu", "Bảo hành"]).toContain(x.giaiDoan);
      expect(["Đang xử lý", "Hoàn thành", "Chờ duyệt", "Tạm dừng", "Đã hủy"]).toContain(x.trangThai);
      expect(x.soNhanSu as number).toBeLessThanOrEqual(20);
      expect(x.soDiem as number).toBeGreaterThanOrEqual(0);
    }
  });

  it("never ends a project before it starts", () => {
    for (const x of rows()) if (x.ktDuKien) expect(String(x.ktDuKien) >= String(x.ngayBatDau)).toBe(true);
  });
});

describe("dbml, graphql and csv input", () => {
  it("reads DBML with refs", () => {
    const src = `Table users {\n  id integer [pk]\n  name varchar\n}\nTable orders {\n  id integer [pk]\n  user_id integer [ref: > users.id]\n  total decimal\n}`;
    expect(detectFormat(src)).toBe("dbml");
    const s = parseSchema(src);
    expect(s.tables.map((t) => t.name)).toEqual(["users", "orders"]);
    expect(s.tables[1].fields[1].ref).toEqual({ table: "users", field: "id" });
  });
  it("reads GraphQL SDL", () => {
    const src = `type User {\n  id: ID!\n  email: String!\n  age: Int\n}`;
    expect(detectFormat(src)).toBe("graphql");
    const f = parseSchema(src).tables[0].fields;
    expect(f.map((x) => x.kind)).toEqual(["uuid", "string", "integer"]);
    expect(f[2].optional).toBe(true);
  });
  it("reads a CSV header and infers types", () => {
    const s = parseSchema("id,name,price,active\n1,Ann,9.5,true\n2,Bo,10.25,false");
    expect(s.tables[0].fields.map((x) => x.kind)).toEqual(["integer", "string", "number", "boolean"]);
  });
});
