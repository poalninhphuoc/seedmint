# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> 粘贴数据结构，即可获得多语言、多格式的逼真示例数据。让 vibe coding 的应用不再是空白页面。

开源的示例数据（种子数据、模拟数据）生成工具：从 Prisma、Drizzle、Zod、SQL Schema 生成姓名、地址、电话都本地化的数据。

**在线体验：** https://seedmint.vercel.app

**状态：** 早期但可用。CLI、库和 Web Studio（6 种界面语言、ER 图、11 个示例 schema）均已可使用。输入：Prisma、Drizzle、Zod、TypeScript、SQL、DBML、GraphQL、OpenAPI、JSON Schema、CSV；输出：JSON、JSONL、CSV、SQL、Excel、`seed.ts`、`mock.ts`、AI 提示词。计划中：MSW、Playwright fixtures、MCP 服务器、文档站、直接写入数据库和 AI 引擎。

<p align="center">
  <img src="docs/images/diagram.png" alt="8 张表的电商 schema ER 图" width="880">
</p>

## 为什么

AI 生成的原型常常只有空表或 `John Doe`。没有可信数据，就很难审查界面、国际化问题和边界情况。seedmint 把你已有的结构直接变成可用的数据。支持 TypeScript、Zod、Prisma、Drizzle、SQL、DBML、GraphQL、OpenAPI、JSON，理解外键关系，可固定随机种子，并提供 Claude Code skill（MCP 服务器在计划中）。

## 快速使用

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## Web Studio

启动管理界面（Next.js、shadcn/ui、多语言）：

```bash
pnpm install
pnpm --filter @seedmint/web dev   # http://localhost:3000
```

界面支持 6 种语言：English、Tiếng Việt、简体中文、日本語、한국어、Español。

页面：**Studio**（生成与导出）、**图表**（schema 的 ER 视图，可拖动表格、导出 Mermaid/SVG，见 [docs/diagram.md](docs/diagram.md)）、**历史**、**区域语言**、**格式**。示例菜单内置 11 个示例 schema。

## 路线图与贡献

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## 关键词

示例数据生成器 · 种子数据 · 模拟数据 · 测试数据 · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · 中文模拟数据 · vibe coding · Claude Code · Cursor
