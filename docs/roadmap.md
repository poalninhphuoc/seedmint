# Roadmap

## MVP (about 1 week)
- [x] Schema model + field inference
- [x] Parsers: TypeScript, Zod, SQL `CREATE TABLE`
- [x] Locales: `vi`, `en` (on top of `@faker-js/faker`)
- [x] Formats: JSON, CSV, SQL INSERT
- [x] Web Studio: Next.js App Router + shadcn/ui, six UI languages (`apps/web`)
- [x] Studio: folder import with file tree, per-table row counts, table preview tabs (search, sort, pagination), history, dark mode, resizable panes
- [x] Diagram: ER view with coloured edges, click-to-highlight, show/hide, search, zoom, Mermaid and SVG export (see [diagram.md](diagram.md))
- [x] Diagram: draggable tables, pan, Ctrl/⌘+wheel zoom, join-table and root detection, file/folder import, eleven built-in sample schemas
- [x] Diagram: PNG export
- [x] Diagram: composite-key lines (SQL and Prisma keep every column; one bracketed line, consistent generated rows)
- [x] Diagram: group tables by schema/module (SQL `schema.table`, Prisma `@@schema`, DBML `schema.table`; one dashed frame per group)

## Next
- [x] JSON-sample and one-line DSL parsers
- [x] Prisma, Drizzle and JSON Schema parsers
- [x] GraphQL and DBML parsers, CSV header input
- [x] OpenAPI 3.x / Swagger 2.0 parser (JSON or YAML, `allOf` merge, enum refs)
- [x] Foreign-key aware generation
- [x] JSONL and typed `mock.ts` output
- [x] `seed.ts` for Prisma and Drizzle, and a Markdown "vibe prompt" export for AI coding tools
- [x] Excel (`.xlsx`) export, zip bundle for multi-file exports
- [ ] MSW handlers, Playwright fixtures
- [x] Locale codes `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es` accepted (names/addresses via faker; native text pools and ID formats still to do)
- [ ] Locales: richer data for `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es`
- [ ] Claude Code skill polished, MCP server
- [x] Edge-case mode (`--edge-cases`)
- [x] SQL per database (PostgreSQL, MySQL/MariaDB, SQLite, SQL Server) with optional `CREATE TABLE`
- [x] Regional date and number formats for preview, CSV and Excel; CSV delimiter and BOM
- [x] Schema folders (`prisma/schema/*.prisma`, several Drizzle files) in the Studio and CLI
- [x] Vietnamese column-name inference (hoVaTen, diaChi, ngayBatDau...), `// YYYY-MM-DD` comment hints, sequential codes, ordered date ranges
- [ ] Same name inference for other locales (ja, ko, zh, th, id)

- [x] Coherent rows: email from the name, age from the birth date, province from the address, shipped/paid dates after the order date, Vietnamese names family-name first, country of the locale
- [x] Studio: foreign-key cells are links that open the parent table and outline the row; a reload restores the same table, row and data
- [x] Review text follows its star rating (vi, en); ratings are whole stars or half stars
- [ ] Same coherence for gender vs name, status pools per table (order vs user), country-aware city for non-vi locales

## Later
- [ ] Image placeholders, scenario dates ("last 30 days")
- [ ] VS Code extension

## Platform
- [x] Turborepo monorepo: `packages/core`, `packages/cli`, `apps/web`
- [x] `seedmint init` (detects ORM, writes `seedmint.config.ts`) and `seedmint generate`
- [x] GitHub Actions CI, issue forms, SECURITY, CODEOWNERS
- [ ] `apps/docs`: documentation and API reference
- [ ] Insert directly into a database (`--db <url>`) instead of writing a file
- [ ] AI engine (opt-in, Vercel AI SDK) for business-specific columns; rule-based faker stays the default
- [ ] README demo GIF
