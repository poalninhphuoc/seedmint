# seedmint

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> Pega un esquema y obtén datos de ejemplo realistas en cualquier idioma y formato. Para que las apps de vibe coding no se vean vacías.

Generador de datos de ejemplo (seed data, mock data) de código abierto a partir de esquemas Prisma, Drizzle, Zod y SQL, con nombres, direcciones y teléfonos localizados.

**Demo en vivo:** https://seedmint.vercel.app

**Estado:** temprano pero utilizable. La CLI, la biblioteca y el Web Studio (6 idiomas, diagrama ER, 11 esquemas de ejemplo) ya funcionan. Entrada: Prisma, Drizzle, Zod, TypeScript, SQL, DBML, GraphQL, OpenAPI, JSON Schema, CSV; salida: JSON, JSONL, CSV, SQL, Excel, `seed.ts`, `mock.ts`, prompt para IA. Planificado: MSW, fixtures de Playwright, servidor MCP, sitio de documentación, inserción directa en base de datos y motor de IA.

<p align="center">
  <img src="docs/images/diagram.png" alt="Diagrama ER de un esquema de comercio electrónico con 8 tablas" width="880">
</p>

## Por qué

Los prototipos hechos con IA suelen tener tablas vacías o `John Doe`. Sin datos creíbles es difícil revisar la interfaz, la internacionalización y los casos límite. seedmint convierte la estructura que ya tienes en datos útiles. Soporta TypeScript, Zod, Prisma, Drizzle, SQL, DBML, GraphQL, OpenAPI y JSON, entiende relaciones entre tablas, permite semillas fijas y ofrece un skill de Claude Code (el servidor MCP está planificado).

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

Páginas: **Studio** (generar y exportar), **Diagrama** (vista ER del esquema, tablas arrastrables, exporta Mermaid/SVG; ver [docs/diagram.md](docs/diagram.md)), **Datos** (panel de administración generado: ver, añadir, editar y borrar filas, con claves foráneas elegidas entre filas existentes), **Historial** (tus bases de datos y sus versiones, con datos), **Idiomas** y **Formatos**. El menú de ejemplos trae 11 esquemas.

## Hoja de ruta y contribuciones

[docs/roadmap.md](docs/roadmap.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [MIT](LICENSE)

## Palabras clave

generador de datos de ejemplo · seed data · mock data · datos de prueba · Prisma seed · Drizzle seed · Zod · SQL INSERT · faker · datos falsos en español · vibe coding · Claude Code · Cursor
