# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> Pega un esquema y obtén datos de ejemplo realistas en cualquier idioma y formato. Para que las apps de vibe coding no se vean vacías.

Generador de datos de ejemplo (seed data, mock data) de código abierto a partir de esquemas Prisma, Drizzle, Zod y SQL, con nombres, direcciones y teléfonos localizados.

**Demo en vivo:** https://seedmint.vercel.app

**Estado:** la CLI, la biblioteca y el Web Studio ya funcionan (entrada: Prisma, Drizzle, Zod, TypeScript, SQL, JSON Schema; salida: JSON, CSV, SQL, `seed.ts`, prompt para IA).

## Por qué

Los prototipos hechos con IA suelen tener tablas vacías o `John Doe`. Sin datos creíbles es difícil revisar la interfaz, la internacionalización y los casos límite. seedmint convierte la estructura que ya tienes en datos útiles. Soporta TypeScript, Zod, Prisma, Drizzle, SQL, JSON y OpenAPI, entiende relaciones entre tablas, permite semillas fijas y ofrece un skill de Claude Code y un servidor MCP.

## Uso rápido

- `npx seedmint schema.ts --locale vi,en --rows 50 --format json`
- JSON · CSV · SQL · seed.ts · mock.ts · MSW · Excel
- vi · en · ja · ko · zh · th · id · fr · de · es

## Web Studio

Ejecuta la interfaz de administración (Next.js, shadcn/ui, multilingüe):

```bash
pnpm install
pnpm --filter @seedmint/web dev   # http://localhost:3000
```

La interfaz está en 6 idiomas: English, Tiếng Việt, 简体中文, 日本語, 한국어, Español.

## Hoja de ruta y contribuciones

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## Palabras clave

generador de datos de ejemplo · seed data · mock data · datos de prueba · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · datos falsos en español · vibe coding · Claude Code · Cursor
