# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> 스키마를 붙여넣으면 여러 언어와 형식의 현실적인 샘플 데이터를 만들어 줍니다. 바이브 코딩 앱이 텅 비지 않게 합니다.

Prisma, Drizzle, Zod, SQL 스키마로 이름·주소·전화번호까지 현지화된 샘플 데이터(시드 데이터, 목 데이터)를 만드는 오픈 소스 도구입니다.

**데모:** https://seedmint.vercel.app

**상태:** 초기 단계이지만 사용할 수 있습니다. CLI, 라이브러리, Web Studio(UI 6개 언어, ER 다이어그램, 예시 스키마 11종)가 동작합니다. 입력: Prisma, Drizzle, Zod, TypeScript, SQL, DBML, GraphQL, OpenAPI, JSON Schema, CSV / 출력: JSON, JSONL, CSV, SQL, Excel, `seed.ts`, `mock.ts`, AI 프롬프트. 계획 중: MSW, Playwright 픽스처, MCP 서버, 문서 사이트, DB 직접 삽입, AI 엔진.

<p align="center">
  <img src="docs/images/diagram.png" alt="테이블 8개짜리 쇼핑몰 스키마의 ER 다이어그램" width="880">
</p>

## 왜 필요한가

AI가 만든 프로토타입은 빈 테이블이나 `John Doe`뿐인 경우가 많습니다. 믿을 만한 데이터가 없으면 UI, 다국어, 엣지 케이스를 검토하기 어렵습니다. seedmint는 이미 가진 구조를 바로 쓸 수 있는 데이터로 바꿔 줍니다. TypeScript, Zod, Prisma, Drizzle, SQL, DBML, GraphQL, OpenAPI, JSON을 지원하고, 외래 키 관계를 이해하며, 시드 고정으로 재현 가능하고, Claude Code 스킬을 제공합니다(MCP 서버는 계획 중).

## 빠른 시작

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## Web Studio

관리자 화면(Next.js, shadcn/ui, 다국어)을 실행합니다.

```bash
pnpm install
pnpm --filter @seedmint/web dev   # http://localhost:3000
```

화면은 6개 언어를 지원합니다: English, Tiếng Việt, 简体中文, 日本語, 한국어, Español.

페이지: **Studio**(생성 및 내보내기), **다이어그램**(스키마 ER 보기, 테이블 드래그, Mermaid/SVG 내보내기, [docs/diagram.md](docs/diagram.md) 참고), **기록**, **로케일**, **형식**. 예시 메뉴에 스키마 11종이 있습니다.

## 로드맵과 기여

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## 키워드

샘플 데이터 생성 · 시드 데이터 · 목 데이터 · 테스트 데이터 · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · 한국어 더미 데이터 · 바이브 코딩 · Claude Code · Cursor
