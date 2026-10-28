# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> Paste a schema. Get realistic sample data in any language and format. Built so vibe-coded apps never look empty.

**Status:** MVP. The CLI and library work; the web playground, Prisma/Drizzle/OpenAPI parsers and most locales are still planned (see the roadmap).

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

## Usage

```bash
pnpm install && pnpm build

# paste/point at a schema (TypeScript, Zod, SQL, JSON sample, or users(name, email) one-liners)
node dist/cli.js schema.sql --locale vi,en --rows users=50,orders=200 --format sql --seed 42

# from stdin
echo 'users(name, email, phone?, avatar:image)' | node dist/cli.js - -l vi -n 10
```

Options: `--locale`, `--rows`, `--format json|jsonl|csv|sql|ts`, `--seed`, `--from ts|zod|sql|dsl|json`, `--edge-cases`, `--out <dir>`.

```ts
import { parseSchema, mint, render } from "seedmint";

const schema = parseSchema(sqlOrTsOrZod);
const data = mint({ schema, locale: ["vi", "en"], rows: 50, seed: 42 });
const [{ content }] = render(data, "sql", schema);
```

Tables are generated parents first, so foreign keys (explicit, or `user_id` pointing at `users`) always reference real rows. Output is repeatable for the same seed within a day (relative dates are based on today).

A web playground (paste on the left, data on the right) is still planned.

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
