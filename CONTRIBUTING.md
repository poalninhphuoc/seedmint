# Contributing

Thanks for helping. The project is in planning, so the most useful contributions right now are:

- Feedback on the design in `docs/`
- Locale data for your language (see `docs/locales.md`)
- Example schemas from real projects (anonymized)

Guidelines: TypeScript, small focused PRs, English for code and docs (translations of the README are welcome), conventional commits (`feat:`, `fix:`, `docs:`).

## Development

```bash
pnpm install
pnpm typecheck && pnpm build && pnpm test
```

Packages: `packages/core` (library) and `packages/cli` (the `seedmint` command). Open an issue first for large changes. Security problems: see [SECURITY.md](SECURITY.md).
