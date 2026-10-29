import { MAX_SNAPSHOT, type Dataset } from "@/lib/dataset";
import type { StudioSettings } from "@/lib/studio-state";
import { readItem as read, removeItem, writeItem } from "@/lib/storage";
import { clearCurrentProject, currentProjectId, forgetWork, setCurrentProject, slotKey } from "@/lib/current-project";
import { saveSchema, saveSettings, loadSchema } from "@/lib/studio-state";
import { saveDataset } from "@/lib/dataset";

export { currentProjectId, setCurrentProject };

/** One run, export or save of a database: the schema and settings to come back to, and optionally its data. */
export interface Version {
  id: string;
  at: string;
  kind: "generate" | "export" | "save";
  now: string;
  settings: StudioSettings;
  /** Null when the schema was too large to keep. */
  schema: string | null;
  tables: number;
  rows: number;
  files: string[];
  /** Rows as the data admin had them; null when there were none or they were too large. */
  data: Dataset | null;
}

/** A database: the versions of one set of tables, newest first. */
export interface Project {
  id: string;
  name: string;
  tableNames: string[];
  updatedAt: string;
  /** Id of the ready-made sample this project started from, or null for a blank one. */
  sample?: string | null;
  versions: Version[];
}

const PROJECTS_KEY = "seedmint:projects";
const LEGACY_KEY = "seedmint:history";
const MAX_PROJECTS = 40;
const MAX_VERSIONS = 30;
const MAX_SCHEMA_KEPT = 200_000;

/** Two sets of table names are the same database when at least half of them are shared. */
export function sameDatabase(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const shared = a.filter((n) => b.includes(n)).length;
  return shared / new Set([...a, ...b]).size >= 0.5;
}

export function autoName(tableNames: string[]): string {
  if (!tableNames.length) return "Database";
  const head = tableNames.slice(0, 3).join(", ");
  return tableNames.length > 3 ? `${head} +${tableNames.length - 3}` : head;
}

const TABLE_NAME = /(?:^|\n)\s*(?:model|table|entity|interface|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+["`[]?(\w+)/gi;
const guessTables = (schema: string | null) => [...new Set([...(schema ?? "").matchAll(TABLE_NAME)].map((m) => m[1]))];

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The saved flat history of older builds, grouped into databases by schema text. */
function migrate(): Project[] {
  let old: Omit<Version, "data">[] = [];
  try {
    old = JSON.parse(read(LEGACY_KEY) ?? "[]");
  } catch {
    /* unreadable: start empty */
  }
  const bySchema = new Map<string, Project>();
  [...old].reverse().forEach((h, i) => {
    const key = h.schema ?? `none:${i}`;
    const names = guessTables(h.schema);
    let p = bySchema.get(key) ?? [...bySchema.values()].find((x) => sameDatabase(x.tableNames, names));
    if (!p) {
      p = { id: newId(), name: autoName(names), tableNames: names, updatedAt: h.at, versions: [] };
      bySchema.set(key, p);
    }
    p.versions.unshift({ ...h, data: null });
    p.updatedAt = h.at;
  });
  return [...bySchema.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_PROJECTS);
}

export function loadProjects(): Project[] {
  const raw = read(PROJECTS_KEY);
  if (raw === null) {
    const moved = migrate();
    if (moved.length) save(moved);
    return moved;
  }
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(list: Project[]) {
  // A full store drops the oldest versions until it fits; only when even one version each does not fit is the user warned.
  for (let keep = MAX_VERSIONS; keep >= 1; keep = Math.floor(keep / 2)) {
    const body = JSON.stringify(list.map((p) => ({ ...p, versions: p.versions.slice(0, keep) })));
    if (writeItem(PROJECTS_KEY, body, keep === 1)) return;
  }
}

/**
 * Starts a project with its own id and its own working state. `schema` is the sample's text, or "" for a blank one.
 * It becomes the open project.
 */
export function createProject(name: string, sample: string | null, schema: string): Project {
  const names = guessTables(schema);
  const p: Project = { id: newId(), name: name.trim() || autoName(names), tableNames: names, updatedAt: new Date().toISOString(), sample, versions: [] };
  save([p, ...loadProjects()].slice(0, MAX_PROJECTS));
  setCurrentProject(p.id);
  saveSchema(schema);
  return p;
}

/** Makes a project the open one. A project that has no working state yet (filed from older builds) starts from its latest version. */
export function openProject(id: string) {
  setCurrentProject(id);
  if (loadSchema() !== null) return;
  const v = loadProjects().find((p) => p.id === id)?.versions[0];
  if (!v?.schema) return saveSchema("");
  saveSchema(v.schema);
  saveSettings(v.settings);
  saveDataset(v.data);
}

const LEGACY_WORK: [string, "schema" | "studio" | "view" | "dataset"][] = [
  ["seedmint:schema", "schema"], ["seedmint:studio", "studio"], ["seedmint:view", "view"], ["seedmint:dataset", "dataset"],
];

/**
 * The id of the open project, or null when the person has to pick or start one.
 * Work saved by older builds (one global schema) is adopted as a project of its own, once.
 */
export function ensureWorkspace(): string | null {
  const cur = currentProjectId();
  if (cur && loadProjects().some((p) => p.id === cur)) return cur;
  const legacy = read("seedmint:schema");
  if (legacy === null) return null;
  const names = guessTables(legacy);
  const p: Project = { id: newId(), name: autoName(names), tableNames: names, updatedAt: new Date().toISOString(), sample: null, versions: [] };
  save([p, ...loadProjects()].slice(0, MAX_PROJECTS));
  for (const [old, slot] of LEGACY_WORK) {
    const v = read(old);
    const k = slotKey(slot, p.id)!;
    if (v !== null) writeItem(k, v, false);
    removeItem(old);
  }
  setCurrentProject(p.id);
  return p.id;
}

export type VersionInput = Omit<Version, "id" | "at" | "schema" | "tables" | "data"> & {
  schema: string;
  /** Names of the tables; they decide which database this version belongs to. */
  tables: string[];
  data?: Dataset | null;
};

/** Files a version under the database it belongs to (the open one if the tables match), creating one when none does. */
export function addVersion(e: VersionInput): Project {
  const list = loadProjects();
  // A version belongs to the project that is open: the id decides, never a guess from table names.
  const open = list.find((p) => p.id === currentProjectId());
  const project = open ?? list.find((p) => sameDatabase(p.tableNames, e.tables)) ??
    { id: newId(), name: autoName(e.tables), tableNames: e.tables, updatedAt: "", versions: [] };
  const at = new Date().toISOString();
  const { tables, data, ...rest } = e;
  const version: Version = {
    ...rest, tables: tables.length, id: newId(), at,
    schema: e.schema.length <= MAX_SCHEMA_KEPT ? e.schema : null,
    data: data && JSON.stringify(data).length <= MAX_SNAPSHOT ? data : null,
  };
  const next: Project = { ...project, tableNames: e.tables, updatedAt: at, versions: [version, ...project.versions].slice(0, MAX_VERSIONS) };
  save([next, ...list.filter((p) => p.id !== project.id)].slice(0, MAX_PROJECTS));
  setCurrentProject(next.id);
  return next;
}

const update = (f: (list: Project[]) => Project[]) => save(f(loadProjects()));

export const renameProject = (id: string, name: string) =>
  update((l) => l.map((p) => (p.id === id ? { ...p, name: name.trim() || autoName(p.tableNames) } : p)));
export function removeProject(id: string) {
  update((l) => l.filter((p) => p.id !== id));
  forgetWork(id);
  if (currentProjectId() === id) clearCurrentProject();
}
export const removeVersion = (projectId: string, versionId: string) =>
  update((l) => l.map((p) => (p.id !== projectId ? p : { ...p, versions: p.versions.filter((v) => v.id !== versionId) })));
export function clearProjects() {
  for (const p of loadProjects()) forgetWork(p.id);
  clearCurrentProject();
  save([]);
}
