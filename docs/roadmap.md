# Roadmap

## MVP (about 1 week)
- [x] Schema model + field inference
- [x] Parsers: TypeScript, Zod, SQL `CREATE TABLE`
- [x] Locales: `vi`, `en` (on top of `@faker-js/faker`)
- [x] Formats: JSON, CSV, SQL INSERT
- [ ] One-page Next.js playground (paste, generate, download)

## Next
- [x] JSON-sample and one-line DSL parsers
- [ ] Prisma, Drizzle, OpenAPI parsers
- [x] Foreign-key aware generation
- [x] JSONL and typed `mock.ts` output
- [ ] `seed.ts`, MSW, Playwright fixtures, Excel output
- [x] Locale codes `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es` accepted (names/addresses via faker; native text pools and ID formats still to do)
- [ ] Locales: richer data for `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es`
- [ ] Claude Code skill polished, MCP server
- [x] Edge-case mode (`--edge-cases`)

## Later
- [ ] Image placeholders, scenario dates ("last 30 days")
- [ ] VS Code extension
