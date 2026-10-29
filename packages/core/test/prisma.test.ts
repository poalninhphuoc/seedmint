import { describe, expect, it } from "vitest";
import { parsePrisma } from "../src/parsers/prisma.js";
describe("parsePrisma block ends", () => {
  it("does not read the fields of the next model when a closing brace is not found", () => {
    // an unbalanced backtick hides the closing brace of A from the bracket scanner
    const src = "model A {\n  id String @id\n  note String @map(`x)\n}\n\nmodel B {\n  id String @id\n  title String\n}\n";
    const t = Object.fromEntries(parsePrisma(src).tables.map((x) => [x.name, x.fields.map((f) => f.name)]));
    expect(t.A).not.toContain("title");
    expect(t.B).toEqual(["id", "title"]);
  });
});
