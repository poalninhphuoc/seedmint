import { beforeEach, describe, expect, it } from "vitest";
import { addVersion, createProject, ensureWorkspace, loadProjects, openProject, removeProject } from "../src/lib/history";
import { currentProjectId } from "../src/lib/current-project";
import { loadSchema, saveSchema } from "../src/lib/studio-state";
import { SAMPLES } from "../src/lib/sample";

beforeEach(() => {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
});

const version = (schema: string, tables: string[]) => ({
  kind: "save" as const, now: "2026-01-01", schema, tables, rows: 0, files: [],
  settings: { from: "auto", locale: "en", rows: 10, tableRows: {}, seed: 42, format: "json", edgeCases: false, dialect: "postgres", ddl: true, regional: true, region: { date: "yyyy-MM-dd", decimal: ".", thousands: "," } },
} as Parameters<typeof addVersion>[0]);

describe("projects", () => {
  it("gives every project its own id and its own schema", () => {
    const a = createProject("A", SAMPLES[0].id, SAMPLES[0].schema);
    saveSchema("changed in A");
    const b = createProject("B", null, "");
    expect(a.id).not.toBe(b.id);
    expect(currentProjectId()).toBe(b.id);
    expect(loadSchema()).toBe("");
    openProject(a.id);
    expect(loadSchema()).toBe("changed in A");
  });

  it("files a version under the open project even when another has the same tables", () => {
    const a = createProject("A", null, "model User { id Int }");
    const b = createProject("B", null, "model User { id Int }");
    addVersion(version("model User { id Int }", ["User"]));
    const list = loadProjects();
    expect(list.find((p) => p.id === b.id)!.versions).toHaveLength(1);
    expect(list.find((p) => p.id === a.id)!.versions).toHaveLength(0);
  });

  it("adopts the single schema of older builds as a project, once", () => {
    localStorage.setItem("seedmint:schema", "model Post { id Int }");
    const id = ensureWorkspace();
    expect(id).toBeTruthy();
    expect(loadSchema()).toBe("model Post { id Int }");
    expect(localStorage.getItem("seedmint:schema")).toBeNull();
    expect(ensureWorkspace()).toBe(id);
    expect(loadProjects()).toHaveLength(1);
  });

  it("asks to pick a project when none is open, and forgets the work of a removed one", () => {
    expect(ensureWorkspace()).toBeNull();
    const a = createProject("A", null, "x");
    removeProject(a.id);
    expect(ensureWorkspace()).toBeNull();
    expect(localStorage.getItem(`seedmint:w:${a.id}:schema`)).toBeNull();
  });
});
