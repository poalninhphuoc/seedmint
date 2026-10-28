# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> Dán cấu trúc dữ liệu, nhận data mẫu thật đúng ngôn ngữ và định dạng. Để app vibe-code không bao giờ trống trơn.

**Trạng thái: đang lên kế hoạch.**

## Vì sao

Prototype do AI dựng thường chỉ có bảng trống hoặc `John Doe`. Không có data tin được thì khó review giao diện, lỗi đa ngôn ngữ và ca biên. seedmint biến cấu trúc bạn đã có thành data dùng được ngay. Hỗ trợ TypeScript, Zod, Prisma, Drizzle, SQL, JSON, OpenAPI; hiểu quan hệ khóa ngoại; có seed cố định để lặp lại kết quả; có skill cho Claude Code và MCP server.

## Dùng nhanh

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## Lộ trình và đóng góp

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)
