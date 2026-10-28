# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> Paste a schema. Get realistic sample data in any language and format. Built so vibe-coded apps never look empty.

**Status:** early planning. APIs and names below are a design target, not shipped yet.

## Why

AI-built prototypes (Claude Code, Cursor, v0, Lovable) often ship with empty tables or "Lorem ipsum" and `John Doe`. Reviewing a UI without believable data hides layout bugs, i18n bugs and edge cases. seedmint turns the structure you already have into data you can actually review.

## What it does

- **Paste any structure:** TypeScript `interface`/`type`, Zod, Prisma, Drizzle, SQL `CREATE TABLE`, JSON sample, OpenAPI, or a one-line description like `users(name, email, phone, address, created_at)`.
- **Understands fields and relations:** `email`, `phone`, `price`, `avatar` get the right kind of value; `orders.user_id` points to a real `users.id`.
- **Many output formats:** JSON, JSONL, CSV, SQL `INSERT`, Prisma/Drizzle `seed.ts`, typed `mock.ts`, MSW handlers, Playwright/Vitest fixtures, Excel.
- **Many locales:** `vi`, `en`, `ja`, `ko`, `zh`, `th`, `id`, `fr`, `de`, `es`. Names, addresses, phones, currency, dates and IDs follow local rules. Mix locales in one table to test i18n.
- **Repeatable:** fixed seeds give the same data every run.
- **Edge cases on demand:** empty strings, very long names, emoji, RTL text.
- **Built for AI tools:** ships a Claude Code skill and an MCP server so agents can call `generate_data(schema, locale, rows)`.

## Planned usage

```bash
# CLI
npx seedmint schema.ts --locale vi,en --rows 50 --format json

# Library
import { mint } from "seedmint";
const data = mint({ schema, locale: "vi", rows: 50, seed: 42 });
```

A web playground (paste on the left, data on the right) is also planned.

## Roadmap

See [docs/roadmap.md](docs/roadmap.md). MVP: TypeScript/Zod/SQL parsers, `vi` + `en`, JSON/CSV/SQL output, one-page Next.js playground.

## Docs

- [Architecture](docs/architecture.md)
- [Locales](docs/locales.md)
- [Roadmap](docs/roadmap.md)
- [Claude Code skill](.claude/skills/seedmint/SKILL.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
