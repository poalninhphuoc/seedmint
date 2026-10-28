import { describe, expect, it } from "vitest";
import { mint, parseSchema } from "@seedmint/core";
import { SAMPLES, SAMPLE_SCHEMA } from "../src/lib/sample";
import { analyze } from "../src/app/actions";

describe("samples", () => {
  it("has unique ids and starts with the default", () => {
    expect(new Set(SAMPLES.map((s) => s.id)).size).toBe(SAMPLES.length);
    expect(SAMPLES.length).toBeGreaterThanOrEqual(10);
    expect(SAMPLE_SCHEMA).toBe(SAMPLES[0].schema);
  });

  it("covers several input formats", () => {
    expect(new Set(SAMPLES.map((s) => s.format)).size).toBeGreaterThanOrEqual(8);
  });

  it.each(SAMPLES.map((s) => [s.id, s] as const))("%s parses as its declared format with at least 5 tables", (_id, s) => {
    const schema = parseSchema(s.schema);
    expect(schema.tables.length).toBeGreaterThanOrEqual(5);
    for (const t of schema.tables) expect(t.fields.length).toBeGreaterThan(1);
  });

  it.each(SAMPLES.map((s) => [s.id, s] as const))("%s is auto-detected as %s and keeps its relations", async (_id, s) => {
    const r = await analyze({ schema: s.schema, from: "auto" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.detected).toBe(s.format);
      const refs = parseSchema(s.schema).tables.flatMap((t) => t.fields.filter((f) => f.ref));
      expect(refs.length, "at least one foreign key").toBeGreaterThan(0);
    }
  });

  it.each(SAMPLES.map((s) => [s.id, s] as const))("%s generates rows for every table", (_id, s) => {
    const data = mint({ schema: parseSchema(s.schema), rows: 4, seed: 3, locale: s.id === "construction" ? "vi" : "en" });
    for (const [name, rows] of Object.entries(data)) expect(rows, name).toHaveLength(4);
  });
});
