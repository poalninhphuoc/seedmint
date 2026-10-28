export const EXPORT_FORMATS = ["json", "jsonl", "csv", "sql", "ts", "prisma", "drizzle", "prompt", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Formats offered as one-click exports for importing into other tools and databases. */
export const QUICK_EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "xlsx", label: "Excel" },
  { format: "sql", label: "SQL" },
  { format: "json", label: "JSON" },
  { format: "jsonl", label: "JSONL" },
];

export const DIALECT_LABELS = { postgres: "PostgreSQL", mysql: "MySQL / MariaDB", sqlite: "SQLite", mssql: "SQL Server" } as const;

export const DATE_PATTERNS = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd", "dd.MM.yyyy", "dd-MM-yyyy", "yyyy.MM.dd"];
export const DECIMALS = [".", ","];
export const THOUSANDS = [",", ".", " ", "'", ""];

/** A short sample line so people can see what their regional choice looks like. */
export function regionExample(r: { date: string; decimal: string; thousands: string }) {
  const date = r.date.replace("yyyy", "2026").replace("MM", "12").replace("dd", "31");
  const num = `1${r.thousands}234${r.thousands}567${r.decimal}89`;
  return `${date} · ${num}`;
}

/** What the Export menu offers, grouped. `dialect` only applies to SQL. */
export const EXPORT_MENU: { group: string; items: { format: ExportFormat; label: string; dialect?: keyof typeof DIALECT_LABELS }[] }[] = [
  {
    group: "files",
    items: [
      { format: "csv", label: "CSV" },
      { format: "xlsx", label: "Excel (.xlsx)" },
      { format: "json", label: "JSON" },
      { format: "jsonl", label: "JSON Lines" },
    ],
  },
  {
    group: "database",
    items: [
      { format: "sql", label: "SQL · PostgreSQL", dialect: "postgres" },
      { format: "sql", label: "SQL · MySQL / MariaDB", dialect: "mysql" },
      { format: "sql", label: "SQL · SQLite", dialect: "sqlite" },
      { format: "sql", label: "SQL · SQL Server", dialect: "mssql" },
    ],
  },
  {
    group: "code",
    items: [
      { format: "ts", label: "TypeScript mock" },
      { format: "prisma", label: "Prisma seed.ts" },
      { format: "drizzle", label: "Drizzle seed.ts" },
      { format: "prompt", label: "AI prompt (Markdown)" },
    ],
  },
];
