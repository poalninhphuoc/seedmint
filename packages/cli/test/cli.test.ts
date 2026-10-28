import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { detectProject } from "../src/detect.js";

const CLI = join(__dirname, "..", "dist", "cli.js");
const run = (cwd: string, ...args: string[]) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });
const project = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "seedmint-"));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  return dir;
};

const PRISMA = "model User { id Int @id @default(autoincrement())\n email String\n name String }";

describe("detectProject", () => {
  it("prefers Prisma, then Drizzle, Zod, SQL", () => {
    expect(detectProject(project({ "prisma/schema.prisma": PRISMA }))).toMatchObject({ orm: "prisma", schema: "prisma/schema.prisma", format: "prisma" });
    expect(detectProject(project({ "src/db/schema.ts": 'export const t = pgTable("t", { id: serial("id").primaryKey() });' }))).toMatchObject({ orm: "drizzle", schema: "src/db/schema.ts" });
    expect(detectProject(project({ "src/validation.ts": "const a = z.object({ x: z.string() });" }))?.orm).toBe("zod");
    expect(detectProject(project({ "db/schema.sql": "CREATE TABLE a (id int);" }))?.orm).toBe("sql");
    expect(detectProject(project({ "readme.md": "hi" }))).toBeUndefined();
  });
  it("ignores node_modules", () => {
    expect(detectProject(project({ "node_modules/x/schema.prisma": PRISMA }))).toBeUndefined();
  });
});

describe("seedmint CLI (built)", () => {
  it("init writes a config, generate uses it to write seed.ts", () => {
    const dir = project({ "prisma/schema.prisma": PRISMA });
    const init = run(dir, "init");
    expect(init.status).toBe(0);
    expect(readFileSync(join(dir, "seedmint.config.ts"), "utf8")).toContain('"prisma/schema.prisma"');

    const gen = run(dir, "generate", "--locale=vi", "--rows", "3");
    expect(gen.status).toBe(0);
    const seed = readFileSync(join(dir, "prisma/seed.ts"), "utf8");
    expect(seed).toContain("prisma.user.createMany");
    expect(seed.match(/\{ id: /g)).toHaveLength(3);
  });
  it("init refuses to overwrite without --force", () => {
    const dir = project({ "prisma/schema.prisma": PRISMA });
    run(dir, "init");
    expect(run(dir, "init").status).toBe(1);
    expect(run(dir, "init", "--force").status).toBe(0);
  });
  it("positional file still works and writes a prompt file", () => {
    const dir = project({ "s.sql": "CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL);" });
    const r = run(dir, "s.sql", "-f", "prompt", "-n", "2", "-o", "out.md");
    expect(r.status).toBe(0);
    expect(existsSync(join(dir, "out.md"))).toBe(true);
    expect(readFileSync(join(dir, "out.md"), "utf8")).toContain("# Mock data for this project");
  });
  it("reports unknown formats", () => {
    const dir = project({ "s.sql": "CREATE TABLE a (id INT PRIMARY KEY);" });
    const r = run(dir, "s.sql", "-f", "nope");
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Unknown format/);
  });
});
