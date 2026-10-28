# Roadmap

## MVP (about 1 week)
- [x] Schema model + field inference
- [x] Parsers: TypeScript, Zod, SQL `CREATE TABLE`
- [x] Locales: `vi`, `en` (on top of `@faker-js/faker`)
- [x] Formats: JSON, CSV, SQL INSERT
- [ ] One-page Next.js playground (paste, generate, download)

## Next
- [x] JSON-sample and one-line DSL parsers
- [x] Prisma, Drizzle and JSON Schema parsers
- [ ] OpenAPI, GraphQL parsers
- [x] Foreign-key aware generation
- [x] JSONL and typed `mock.ts` output
- [x] `seed.ts` for Prisma and Drizzle, and a Markdown "vibe prompt" export for AI coding tools
- [ ] MSW handlers, Playwright fixtures, Excel output
- [x] Locale codes `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es` accepted (names/addresses via faker; native text pools and ID formats still to do)
- [ ] Locales: richer data for `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es`
- [ ] Claude Code skill polished, MCP server
- [x] Edge-case mode (`--edge-cases`)

## Later
- [ ] Image placeholders, scenario dates ("last 30 days")
- [ ] VS Code extension

## Platform
- [x] Turborepo monorepo: `packages/core`, `packages/cli`
- [x] `seedmint init` (detects ORM, writes `seedmint.config.ts`) and `seedmint generate`
- [x] GitHub Actions CI, issue forms, SECURITY, CODEOWNERS
- [ ] `apps/web`: Web Studio (Next.js App Router, Tailwind, shadcn/ui)
- [ ] `apps/docs`: documentation and API reference
- [ ] Insert directly into a database (`--db <url>`) instead of writing a file
- [ ] AI engine (opt-in, Vercel AI SDK) for business-specific columns; rule-based faker stays the default
- [ ] README demo GIF
