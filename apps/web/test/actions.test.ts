import { describe, expect, it } from "vitest";
import { analyze, generate, importFiles, type GenerateInput } from "../src/app/actions";

const SCHEMA = `model User {
  id Int @id
  name String
  balance Float
  joinedAt DateTime @default(now())
}
model Order {
  id Int @id
  userId Int
  user User @relation(fields: [userId], references: [id])
  total Float
}`;

const base: GenerateInput = {
  schema: SCHEMA, from: "auto", locale: "vi", rows: 5, seed: 1, format: "json", edgeCases: false,
  dialect: "postgres", ddl: true, regional: true, region: { date: "dd/MM/yyyy", decimal: ",", thousands: "." }, now: "2026-10-01",
};

describe("generate", () => {
  it("previews dates and numbers in the chosen regional format", async () => {
    const r = await generate(base);
    if (!r.ok) throw new Error(r.error);
    const user = r.preview.find((p) => p.name === "User")!;
    const joined = String(user.rows[0][user.columns.indexOf("joinedAt")]);
    expect(joined).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(user.rows[0][0]).toBe(1);
  });

  it("applies hand edits to the preview and to the exported file, and ignores unknown targets", async () => {
    const edits = { User: { "1": { name: "Nguyễn Văn Test", balance: 1234.5, nope: "x" } }, Ghost: { "0": { a: 1 } }, __proto__: { "0": { a: 1 } } };
    const plain = await generate(base);
    const r = await generate({ ...base, edits });
    if (!r.ok || !plain.ok) throw new Error("failed");
    const user = r.preview.find((p) => p.name === "User")!;
    expect(user.rows[1][user.columns.indexOf("name")]).toBe("Nguyễn Văn Test");
    expect(user.columns).not.toContain("nope");
    // the other rows are untouched, and the export carries the edit
    expect(user.rows[0]).toEqual(plain.preview.find((p) => p.name === "User")!.rows[0]);
    expect(r.files.map((f) => f.content).join("")).toContain("Nguyễn Văn Test");
    expect(plain.files.map((f) => f.content).join("")).not.toContain("Nguyễn Văn Test");
  });

  it("is reproducible for the same reference day", async () => {
    const a = await generate(base), b = await generate(base);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("honours per-table row counts, including zero", async () => {
    const r = await generate({ ...base, tableRows: { User: 3, Order: 0 } });
    if (!r.ok) throw new Error(r.error);
    expect(r.tables.find((t) => t.name === "User")!.rows).toBe(3);
    expect(r.tables.find((t) => t.name === "Order")!.rows).toBe(0);
  });

  it("writes SQL for the chosen dialect", async () => {
    const r = await generate({ ...base, format: "sql", dialect: "mysql" });
    if (!r.ok) throw new Error(r.error);
    expect(r.files[0].content).toContain("CREATE TABLE IF NOT EXISTS `User`");
  });

  it("uses a semicolon CSV with BOM where the decimal is a comma", async () => {
    const r = await generate({ ...base, format: "csv" });
    if (!r.ok) throw new Error(r.error);
    expect(r.files[0].content.startsWith("﻿id;name;")).toBe(true);
  });

  it("builds an xlsx workbook and zips multi-file exports", async () => {
    const x = await generate({ ...base, format: "xlsx" });
    if (!x.ok) throw new Error(x.error);
    expect(x.files[0].binary).toBe(true);
    expect(Buffer.from(x.files[0].content, "base64").subarray(0, 2).toString()).toBe("PK");
    const z = await generate({ ...base, format: "csv", bundle: true });
    if (!z.ok) throw new Error(z.error);
    expect(z.files.map((f) => f.name)).toEqual(["seedmint-export.zip"]);
  });

  it("reports bad input as an error, not a throw", async () => {
    expect((await generate({ ...base, schema: "" })).ok).toBe(false);
    expect((await generate({ ...base, locale: "xx" })).ok).toBe(false);
  });
});

describe("analyze and importFiles", () => {
  it("lists tables and foreign keys", async () => {
    const r = await analyze({ schema: SCHEMA, from: "auto" });
    if (!r.ok) throw new Error(r.error);
    expect(r.tables.map((t) => t.name)).toEqual(["User", "Order"]);
    expect(r.tables[1].fields.find((f) => f.name === "userId")!.ref).toEqual({ table: "User", field: "id" });
  });

  it("joins a split Prisma folder", async () => {
    const r = await importFiles([
      { path: "prisma/schema/_enums.prisma", content: "enum Role { A B }" },
      { path: "prisma/schema/user.prisma", content: "model User { id Int @id\n role Role }" },
    ]);
    if (!r.ok) throw new Error(r.error);
    expect(r.format).toBe("prisma");
    expect(r.used).toHaveLength(2);
  });
});

describe("importFiles file list", () => {
  it("lists used and ignored files with table counts", async () => {
    const r = await importFiles([
      { path: "db/schema/user.prisma", content: "model User { id Int @id }\nmodel Profile { id Int @id }" },
      { path: "db/schema/_enums.prisma", content: "enum Role { A }" },
      { path: "src/helper.ts", content: "export const x = 1" },
    ]);
    if (!r.ok) throw new Error(r.error);
    const byPath = Object.fromEntries(r.files.map((f) => [f.path, f]));
    expect(byPath["db/schema/user.prisma"]).toEqual({ path: "db/schema/user.prisma", used: true, tables: 2 });
    expect(byPath["src/helper.ts"].used).toBe(false);
  });
});
