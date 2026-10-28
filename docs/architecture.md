# Architecture

Pipeline: **parse → model → generate → format**.

1. **Parsers** turn an input (TS, Zod, Prisma, Drizzle, SQL, JSON, OpenAPI, one-line DSL) into a common `Schema` model: tables, fields, types, constraints, relations.
2. **Field inference** maps a field name and type to a generator (`email` → email, `price` → money in the locale currency).
3. **Generators** are locale-aware and seeded. Relations are resolved by generating parents first, then sampling their ids.
4. **Formatters** write the result: JSON, JSONL, CSV, SQL, `seed.ts`, `mock.ts`, MSW, fixtures, Excel.

Packages (Turborepo monorepo):

| Package | Role |
|---|---|
| `packages/core` (`@seedmint/core`) | Parsers, field inference, generator, formatters, locales |
| `packages/cli` (`seedmint`) | `init` / `generate`, config loading, project detection; bundles core |
| `apps/web` | Next.js Web Studio: generate, export, ER [diagram](diagram.md), history |
| `apps/docs` (planned) | Documentation site |

Inputs: Prisma, Drizzle, Zod, TypeScript, SQL DDL, DBML, GraphQL, OpenAPI/Swagger (JSON or YAML), JSON Schema, JSON sample, CSV, one-line DSL. Outputs: json, jsonl, csv, sql, ts, prisma seed, drizzle seed, AI prompt (Markdown).

The Studio's Diagram page reuses the same `Schema` model: `apps/web/src/lib/er-layout.ts` turns tables and their references into boxes and routed lines, and exports Mermaid. See [diagram.md](diagram.md).

Principles: runs fully local (no data leaves the machine), deterministic with a seed, tree-shakeable locale packs.
