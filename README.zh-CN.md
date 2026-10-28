# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> 粘贴数据结构，即可获得多语言、多格式的逼真示例数据。让 vibe coding 的应用不再是空白页面。

开源的示例数据（种子数据、模拟数据）生成工具：从 Prisma、Drizzle、Zod、SQL Schema 生成姓名、地址、电话都本地化的数据。

**状态：** CLI、库和 Web Studio 已可使用（输入：Prisma、Drizzle、Zod、TypeScript、SQL、JSON Schema；输出：JSON、CSV、SQL、`seed.ts`、AI 提示词）。

## 为什么

AI 生成的原型常常只有空表或 `John Doe`。没有可信数据，就很难审查界面、国际化问题和边界情况。seedmint 把你已有的结构直接变成可用的数据。支持 TypeScript、Zod、Prisma、Drizzle、SQL、JSON、OpenAPI，理解外键关系，可固定随机种子，并提供 Claude Code skill 与 MCP 服务器。

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

## 路线图与贡献

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## 关键词

示例数据生成器 · 种子数据 · 模拟数据 · 测试数据 · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · 中文模拟数据 · vibe coding · Claude Code · Cursor
