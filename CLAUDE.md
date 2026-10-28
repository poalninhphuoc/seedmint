@AGENTS.md

## Claude Code notes

- Use `pnpm` and `./node_modules/.bin/turbo run build typecheck test` before claiming something works.
- When adding a parser or output format, add tests in `packages/core/test/` and update `docs/roadmap.md`.
- The skill in `.claude/skills/seedmint/SKILL.md` describes how to use the CLI for users; keep it in sync with CLI flags.
