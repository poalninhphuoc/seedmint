# Security Policy

## Supported versions

seedmint is pre-1.0. Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's private reporting:
https://github.com/poalninhphuoc/seedmint/security/advisories/new

Include a description, steps or a minimal schema to reproduce, and the affected version. You will get a first reply within 7 days.

## Scope notes

- seedmint runs locally and does not send your schema anywhere. A change that adds network access to the core or CLI is treated as security-relevant.
- `seedmint.config.ts` is transpiled and executed locally, like any other build config. Only run `seedmint generate` in projects you trust.
- Generated identifiers (phones, national IDs, tax codes) are format-valid but fake. Never use them as real data.
