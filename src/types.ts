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
  ref?: { table: string; field: string };
  /** Semantic hint from the source, e.g. "email" from z.string().email(). */
  hint?: string;
}

export interface Table {
  name: string;
  fields: Field[];
}

export interface Schema {
  tables: Table[];
}

export type Row = Record<string, unknown>;
export type Dataset = Record<string, Row[]>;

export type InputFormat = "ts" | "zod" | "sql" | "dsl" | "json";
