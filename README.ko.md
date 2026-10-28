# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> 스키마를 붙여넣으면 여러 언어와 형식의 현실적인 샘플 데이터를 만들어 줍니다. 바이브 코딩 앱이 텅 비지 않게 합니다.

**상태: 기획 단계.**

## 왜 필요한가

AI가 만든 프로토타입은 빈 테이블이나 `John Doe`뿐인 경우가 많습니다. 믿을 만한 데이터가 없으면 UI, 다국어, 엣지 케이스를 검토하기 어렵습니다. seedmint는 이미 가진 구조를 바로 쓸 수 있는 데이터로 바꿔 줍니다. TypeScript, Zod, Prisma, Drizzle, SQL, JSON, OpenAPI를 지원하고, 외래 키 관계를 이해하며, 시드 고정으로 재현 가능하고, Claude Code 스킬과 MCP 서버를 제공합니다.

## 빠른 시작

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## 로드맵과 기여

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)
