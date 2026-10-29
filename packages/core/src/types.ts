export type FieldKind =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "uuid"
  | "json"
  | "enum";

export interface Field {
  name: string;
  kind: FieldKind;
  optional?: boolean;
  primary?: boolean;
  enumValues?: string[];
  /** `group` is shared by the columns of one composite foreign key, in column order. */
  ref?: { table: string; field: string; group?: string };
  /** Semantic hint from the source, e.g. "email" from z.string().email(). */
  hint?: string;
  /** Trailing `// ...` comment from the source, used as an extra hint (e.g. "YYYY-MM-DD"). */
  comment?: string;
}

export interface Table {
  name: string;
  /** Database schema or module the table belongs to (`billing.invoice`, Prisma `@@schema`, DBML `schema.table`). */
  group?: string;
  fields: Field[];
}

export interface Schema {
  tables: Table[];
}

export type Row = Record<string, unknown>;
export type Dataset = Record<string, Row[]>;

export type InputFormat = "ts" | "zod" | "sql" | "dsl" | "json" | "prisma" | "drizzle" | "jsonschema" | "dbml" | "graphql" | "csv" | "openapi";

export type OutputFormat = "json" | "jsonl" | "csv" | "sql" | "ts" | "prisma" | "drizzle" | "prompt";

/** Shape of `seedmint.config.ts`. */
export interface SeedmintConfig {
  /** Schema file to read (Prisma, Drizzle, Zod, TS, SQL, JSON Schema, DBML, GraphQL, OpenAPI, CSV). */
  schema?: string;
  from?: InputFormat;
  locale?: string | string[];
  rows?: number | Record<string, number>;
  seed?: number;
  format?: OutputFormat;
  /** File (when it has an extension) or directory to write into. */
  out?: string;
  edgeCases?: boolean;
}
