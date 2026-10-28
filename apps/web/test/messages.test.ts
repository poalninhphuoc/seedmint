import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routing } from "../src/i18n/routing";

const dir = join(__dirname, "../src/messages");
const load = (l: string) => JSON.parse(readFileSync(join(dir, `${l}.json`), "utf8"));

const keys = (o: unknown, prefix = ""): string[] =>
  typeof o === "object" && o !== null
    ? Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe("messages", () => {
  it("has one catalog per routing locale", () => {
    expect(readdirSync(dir).map((f) => f.replace(".json", "")).sort()).toEqual([...routing.locales].sort());
  });

  it.each(routing.locales)("%s has the same keys as en and no empty values", (l) => {
    expect(keys(load(l)).sort()).toEqual(keys(load("en")).sort());
    for (const k of keys(load(l))) {
      const v = k.split(".").reduce((o, p) => o[p], load(l));
      expect(String(v).trim(), `${l}:${k}`).not.toBe("");
    }
  });
});
