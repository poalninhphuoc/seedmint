import { describe, expect, it } from "vitest";
import { layoutEr, toMermaid, type ErTable } from "../src/lib/er-layout";

const tables: ErTable[] = [
  { name: "Author", fields: [{ name: "id", kind: "uuid", primary: true }, { name: "name", kind: "string" }] },
  { name: "Article", fields: [{ name: "id", kind: "uuid", primary: true }, { name: "author_id", kind: "uuid", ref: { table: "Author", field: "id" } }] },
  { name: "Tag", fields: [{ name: "id", kind: "uuid", primary: true }, { name: "name", kind: "string" }] },
  {
    name: "ArticleTag",
    fields: [
      { name: "article_id", kind: "uuid", ref: { table: "Article", field: "id" } },
      { name: "tag_id", kind: "uuid", ref: { table: "Tag", field: "id" } },
    ],
  },
];

describe("layoutEr", () => {
  const l = layoutEr(tables);
  const role = (n: string) => l.boxes.find((b) => b.table.name === n)!;

  it("puts parents left of children", () => {
    expect(role("Author").x).toBeLessThan(role("Article").x);
    expect(role("Article").x).toBeLessThan(role("ArticleTag").x);
  });

  it("marks join tables and the most referenced table as root", () => {
    expect(role("ArticleTag").role).toBe("join");
    expect(role("Article").role).toBe("root");
    expect(role("Author").role).toBe("entity");
    expect(role("Tag").role).toBe("entity");
  });

  it("draws one edge per foreign key and fits them in the canvas", () => {
    expect(l.edges).toHaveLength(3);
    expect(l.width).toBeGreaterThan(0);
  });

  it("copes with self references and unknown parents", () => {
    const x = layoutEr([{ name: "Node", fields: [{ name: "id", kind: "integer", primary: true }, { name: "parent_id", kind: "integer", ref: { table: "Node", field: "id" } }, { name: "x", kind: "integer", ref: { table: "Missing", field: "id" } }] }]);
    expect(x.boxes).toHaveLength(1);
    expect(x.edges).toHaveLength(1);
  });
});

describe("toMermaid", () => {
  it("emits relationships and keys", () => {
    const m = toMermaid(tables);
    expect(m).toContain('Author ||--o{ Article : "author_id"');
    expect(m).toContain("string id PK");
    expect(m).toContain("string tag_id FK");
  });
});

describe("layoutEr with a large schema", () => {
  const many: ErTable[] = Array.from({ length: 60 }, (_, i) => ({
    name: `T${i}`,
    fields: [{ name: "id", kind: "integer", primary: true }, ...Array.from({ length: 10 }, (_, k) => ({ name: `f${k}`, kind: "string" }))],
  }));
  const l = layoutEr(many);

  it("starts every column at the top and wraps tall levels into more columns", () => {
    expect(Math.min(...l.boxes.map((b) => b.y))).toBe(36);
    expect(new Set(l.boxes.map((b) => b.x)).size).toBeGreaterThan(1);
    expect(l.height).toBeLessThan(3200);
  });
});

describe("edges", () => {
  const l = layoutEr(tables);

  it("name the key on each end and share one colour per parent", () => {
    const e = l.edges.find((x) => x.to === "Article")!;
    expect(e.toField).toBe("author_id");
    expect(e.fromField).toBe("id");
    expect(e.color).toMatch(/^#[0-9a-f]{6}$/);
    const same = layoutEr(tables).edges.filter((x) => x.from === "Article");
    expect(new Set(same.map((x) => x.color)).size).toBe(1);
  });

  it("spreads lines over separate lanes in the gap", () => {
    const xs = new Set(l.edges.map((e) => e.lx));
    expect(xs.size).toBe(l.edges.length);
  });
});
