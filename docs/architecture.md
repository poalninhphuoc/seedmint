# Architecture (draft)

Pipeline: **parse → model → generate → format**.

1. **Parsers** turn an input (TS, Zod, Prisma, Drizzle, SQL, JSON, OpenAPI, one-line DSL) into a common `Schema` model: tables, fields, types, constraints, relations.
2. **Field inference** maps a field name and type to a generator (`email` → email, `price` → money in the locale currency).
3. **Generators** are locale-aware and seeded. Relations are resolved by generating parents first, then sampling their ids.
4. **Formatters** write the result: JSON, JSONL, CSV, SQL, `seed.ts`, `mock.ts`, MSW, fixtures, Excel.

Planned packages (monorepo):

| Package | Role |
|---|---|
| `@seedmint/core` | Schema model, inference, generation |
| `@seedmint/parsers` | Input parsers |
| `@seedmint/formats` | Output formatters |
| `@seedmint/locales` | Locale data packs |
| `seedmint` | CLI |
| `@seedmint/mcp` | MCP server |
| `apps/playground` | Next.js web playground |

Principles: runs fully local (no data leaves the machine), deterministic with a seed, tree-shakeable locale packs.
