# AGENTS.md

seedmint generates realistic, seeded sample data from a schema (Prisma, Drizzle, Zod, TypeScript, SQL, JSON Schema, JSON sample, one-line DSL). Read `docs/architecture.md` first.

## Layout

```
packages/core   @seedmint/core: parsers, inference, generator, formatters, locales (library)
packages/cli    seedmint: `npx seedmint init | generate` (bundles core)
apps/           planned: web studio (Next.js), docs
docs/           architecture, locales, roadmap
```

## Commands

```bash
pnpm install
pnpm typecheck   # turbo: tsc in every package
pnpm build       # turbo: tsup; core builds before cli
pnpm test        # turbo: vitest; CLI tests run the built binary
```

Run a single package: `pnpm --filter @seedmint/core test`. The CLI tests need `pnpm build` first (turbo does this).

## Rules

- Language: TypeScript, ESM, strict. Keep code local-only: never send user schemas to a network service.
- Fake data must be format-valid but not real personal data.
- Output must be repeatable for the same seed. Do not read `Date.now()` in generators; use the `now` option.
- Parsers are text-based and must not execute user code. `seedmint.config.ts` is the only file that is executed.
- Add a test for every new parser, output format or locale. Vitest, files in `packages/*/test/`.
- Ideas, brainstorms and rankings live outside this repo (`../_ideas`). Do not add them here.
- README is multilingual: when changing `README.md`, note what needs updating in the translated files.
