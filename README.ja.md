# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> スキーマを貼るだけで、多言語・多形式のリアルなサンプルデータを生成。バイブコーディングのアプリを空っぽにしません。

Prisma、Drizzle、Zod、SQL のスキーマから、氏名・住所・電話番号まで各国語に対応したサンプルデータ（シードデータ、モックデータ）を作るオープンソースツールです。

**デモ：** https://seedmint.vercel.app

**状態：** 初期段階ですが利用できます。CLI、ライブラリ、Web Studio（UI 6 言語、ER 図、サンプルスキーマ 11 種）が動作します。入力: Prisma、Drizzle、Zod、TypeScript、SQL、DBML、GraphQL、OpenAPI、JSON Schema、CSV／出力: JSON、JSONL、CSV、SQL、Excel、`seed.ts`、`mock.ts`、AI 用プロンプト。計画中: MSW、Playwright フィクスチャ、MCP サーバー、ドキュメントサイト、DB への直接挿入、AI エンジン。

<p align="center">
  <img src="docs/images/diagram.png" alt="8 テーブルの EC スキーマの ER 図" width="880">
</p>

## なぜ必要か

AI が作るプロトタイプは、空のテーブルや `John Doe` ばかりになりがちです。信頼できるデータがないと、UI・多言語対応・エッジケースの確認ができません。seedmint は手元の構造をそのままレビュー可能なデータに変えます。TypeScript、Zod、Prisma、Drizzle、SQL、DBML、GraphQL、OpenAPI、JSON に対応し、外部キーの関係を理解し、シード固定で再現でき、Claude Code スキルも提供します（MCP サーバーは計画中）。

## クイックスタート

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## Web Studio

管理画面（Next.js、shadcn/ui、多言語対応）を起動します。

```bash
pnpm install
pnpm --filter @seedmint/web dev   # http://localhost:3000
```

画面は 6 言語に対応: English, Tiếng Việt, 简体中文, 日本語, 한국어, Español。

ページ: **Studio**（生成とエクスポート）、**ダイアグラム**（スキーマの ER ビュー、テーブルのドラッグ、Mermaid/SVG 出力。[docs/diagram.md](docs/diagram.md) 参照）、**データ**（自動生成の管理画面：行の閲覧・追加・編集・削除、外部キーは既存の行から選択）、**履歴**（データベースとバージョン、データ付き）、**ロケール**、**フォーマット**。サンプルメニューに 11 種のスキーマがあります。

## ロードマップとコントリビュート

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## キーワード

サンプルデータ生成 · シードデータ · モックデータ · テストデータ · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · 日本語ダミーデータ · バイブコーディング · Claude Code · Cursor
