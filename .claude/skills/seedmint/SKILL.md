---
name: seedmint
description: Generate realistic sample/seed/mock data from a schema (TypeScript, Zod, Prisma, Drizzle, SQL, JSON) in a chosen locale and format, so prototypes and UI reviews are not empty. Use when the user asks for fake data, seed data, mock data, fixtures or demo data.
---

# seedmint skill

Use this when a project needs believable data to review UI, test i18n or demo a feature.

## Steps

1. **Find the structure.** Look for Prisma/Drizzle schema, Zod schemas, SQL migrations or TS types in the repo. If none, ask for a one-line description like `users(name, email, phone, created_at)`.
2. **Ask only what is missing:** locale(s) (default `en`; `vi` for Vietnamese apps), number of rows (default 20), output format (default JSON; offer SQL, `seed.ts`, `mock.ts`, MSW, CSV).
3. **Generate.** Run `npx seedmint init` once (detects Prisma/Drizzle/Zod/SQL and writes `seedmint.config.ts`), then `npx seedmint generate --locale=<codes> --rows <n> --format <fmt> --seed 42`. Formats: `json`, `jsonl`, `csv`, `sql`, `ts`, `prisma` (seed.ts), `drizzle` (seed.ts), `prompt` (Markdown to paste into an AI tool). A schema split over many files (for example `prisma/schema/*.prisma`) can be passed as a folder: `npx seedmint generate prisma/schema -l vi`. If the CLI is unavailable, use `@faker-js/faker` with a fixed seed.
4. **Respect relations.** Create parent rows first; child foreign keys must reference existing ids.
5. **Cover edge cases** when asked: empty optional fields, long names, emoji, mixed locales.
6. **Write files** where the project expects them (`prisma/seed.ts`, `src/mocks/`, `tests/fixtures/`) and show how to run them.

## Rules

- Data must be fake: format-valid IDs and phones, never real people.
- Keep it deterministic (fixed seed) so reviews and tests are repeatable.
- Do not send the user's schema to any external service.
