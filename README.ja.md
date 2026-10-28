# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> スキーマを貼るだけで、多言語・多形式のリアルなサンプルデータを生成。バイブコーディングのアプリを空っぽにしません。

**状態：計画段階。**

## なぜ必要か

AI が作るプロトタイプは、空のテーブルや `John Doe` ばかりになりがちです。信頼できるデータがないと、UI・多言語対応・エッジケースの確認ができません。seedmint は手元の構造をそのままレビュー可能なデータに変えます。TypeScript、Zod、Prisma、Drizzle、SQL、JSON、OpenAPI に対応し、外部キーの関係を理解し、シード固定で再現でき、Claude Code スキルと MCP サーバーも提供します。

## クイックスタート

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## ロードマップとコントリビュート

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)
