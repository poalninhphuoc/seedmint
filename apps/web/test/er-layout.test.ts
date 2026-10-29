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

describe("composite foreign keys", () => {
  const composite: ErTable[] = [
    { name: "product", fields: [{ name: "shop_id", kind: "integer", primary: true }, { name: "sku", kind: "string", primary: true }] },
    {
      name: "line",
      fields: [
        { name: "id", kind: "integer", primary: true },
        { name: "shop_id", kind: "integer", ref: { table: "product", field: "shop_id", group: "line:shop_id,sku" } },
        { name: "sku", kind: "string", ref: { table: "product", field: "sku", group: "line:shop_id,sku" } },
      ],
    },
  ];

  it("draws one line with a bracket over both key rows", () => {
    const { edges } = layoutEr(composite);
    expect(edges).toHaveLength(1);
    expect(edges[0].toFields).toEqual(["shop_id", "sku"]);
    expect(edges[0].fromFields).toEqual(["shop_id", "sku"]);
    expect(edges[0].label).toBe("shop_id + sku");
    expect(edges[0].pSpan![0]).toBeLessThan(edges[0].pSpan![1]);
    expect(edges[0].cSpan![0]).toBeLessThan(edges[0].cSpan![1]);
  });

  it("emits one Mermaid relation for the key", () => {
    expect(toMermaid(composite).match(/o\{ line/g)).toHaveLength(1);
  });
});

describe("schema / module groups", () => {
  const grouped: ErTable[] = [
    { name: "user", group: "auth", fields: [{ name: "id", kind: "integer", primary: true }] },
    { name: "session", group: "auth", fields: [{ name: "id", kind: "integer", primary: true }, { name: "user_id", kind: "integer", ref: { table: "user", field: "id" } }] },
    { name: "invoice", group: "billing", fields: [{ name: "id", kind: "integer", primary: true }, { name: "user_id", kind: "integer", ref: { table: "user", field: "id" } }] },
    { name: "payment", group: "billing", fields: [{ name: "id", kind: "integer", primary: true }, { name: "invoice_id", kind: "integer", ref: { table: "invoice", field: "id" } }] },
  ];

  it("stacks one framed cluster per group without overlap", () => {
    const { groups, boxes } = layoutEr(grouped);
    expect(groups.map((g) => g.name).sort()).toEqual(["auth", "billing"]);
    const [a, b] = [...groups].sort((p, q) => p.y - q.y);
    expect(a.y + a.h).toBeLessThan(b.y);
    for (const g of groups)
      for (const box of boxes.filter((x) => x.table.group === g.name)) {
        expect(box.x).toBeGreaterThan(g.x);
        expect(box.y + box.h).toBeLessThan(g.y + g.h);
      }
    expect(layoutEr(grouped).edges).toHaveLength(3);
  });

  it("draws no frames for a single group or none", () => {
    expect(layoutEr(grouped.map((t) => ({ ...t, group: "app" }))).groups).toEqual([]);
    expect(layoutEr(grouped.map(({ group: _g, ...t }) => t)).groups).toEqual([]);
  });
});
