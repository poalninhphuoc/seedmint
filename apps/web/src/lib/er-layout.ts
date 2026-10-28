export interface ErField {
  name: string;
  kind: string;
  primary?: boolean;
  optional?: boolean;
  ref?: { table: string; field: string };
}
export interface ErTable { name: string; fields: ErField[] }
export type Role = "root" | "entity" | "join";

export interface Box { table: ErTable; role: Role; level: number; x: number; y: number; w: number; h: number }
export interface Edge {
  from: string;
  to: string;
  /** Foreign key column on the child table, and the key it points at on the parent. */
  toField: string;
  fromField: string;
  label: string;
  color: string;
  d: string;
  lx: number;
  ly: number;
  /** Text anchor of the label at (lx, ly). */
  la: "start" | "middle";
  p: { x: number; y: number; dir: 1 | -1 };
  c: { x: number; y: number; dir: 1 | -1 };
}

/** Line and accent colours, borrowed from the cable diagram: blue, brown, green, orange, red, violet, gold, sky, slate. */
export const PALETTE = ["#3b62e0", "#8b4a1f", "#4ea45a", "#e8803a", "#d23b3b", "#7c3aed", "#d4a72c", "#2f9fd6", "#6b7280"];
export function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const R = 8;
/** Elbow line with rounded corners, so separate lines stay easy to tell apart where they bend. */
function elbow(x1: number, y1: number, xm: number, y2: number, x2: number): string {
  const dy = y2 - y1;
  if (Math.abs(dy) < 2 * R) return `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`;
  const s = dy > 0 ? 1 : -1;
  return `M ${x1} ${y1} H ${xm - R} Q ${xm} ${y1} ${xm} ${y1 + s * R} V ${y2 - s * R} Q ${xm} ${y2} ${xm + R} ${y2} H ${x2}`;
}
export interface Layout { boxes: Box[]; edges: Edge[]; width: number; height: number }

export const W = 250;
export const HEADER = 50;
export const ROW = 24;
const PAD_BOTTOM = 12;
const GAP_X = 130;
const GAP_Y = 44;
const MARGIN = 36;
const MAX_COLUMN = 2600;

const boxHeight = (t: ErTable) => HEADER + t.fields.length * ROW + PAD_BOTTOM;
const rowY = (b: { y: number }, i: number) => b.y + HEADER + i * ROW + ROW / 2 - 2;

export function isJoin(t: ErTable): boolean {
  const refs = t.fields.filter((f) => f.ref && f.ref.table !== t.name).length;
  const others = t.fields.filter((f) => !f.ref && !f.primary).length;
  return refs >= 2 && others === 0;
}

/** Places parents on the left, children on the right, and routes one elbow line per foreign key. */
export function layoutEr(tables: ErTable[]): Layout {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const inbound = new Map<string, number>();
  for (const t of tables)
    for (const f of t.fields)
      if (f.ref && f.ref.table !== t.name && byName.has(f.ref.table)) inbound.set(f.ref.table, (inbound.get(f.ref.table) ?? 0) + 1);
  // The aggregate root is the single most connected non-join table (needs at least two links).
  const degree = (t: ErTable) =>
    (inbound.get(t.name) ?? 0) + t.fields.filter((f) => f.ref && f.ref.table !== t.name && byName.has(f.ref.table)).length;
  const ranked = tables.filter((t) => !isJoin(t)).map((t) => ({ t, d: degree(t) })).sort((a, b) => b.d - a.d);
  const root = ranked[0] && ranked[0].d >= 2 && ranked[0].d > (ranked[1]?.d ?? 0) ? ranked[0].t.name : undefined;
  const roleOf = (t: ErTable): Role => (isJoin(t) ? "join" : t.name === root ? "root" : "entity");

  const level = new Map<string, number>();
  const visit = (t: ErTable, stack: Set<string>): number => {
    if (level.has(t.name)) return level.get(t.name)!;
    if (stack.has(t.name)) return 0;
    stack.add(t.name);
    const parents = t.fields.flatMap((f) => (f.ref && f.ref.table !== t.name && byName.has(f.ref.table) ? [byName.get(f.ref.table)!] : []));
    const l = parents.length ? 1 + Math.max(...parents.map((p) => visit(p, stack))) : 0;
    stack.delete(t.name);
    level.set(t.name, l);
    return l;
  };
  tables.forEach((t) => visit(t, new Set()));

  // One column per depth level; a level with many tables wraps into further columns so big schemas stay readable.
  const levels = Math.max(0, ...level.values()) + 1;
  const columns: ErTable[][] = [];
  for (let l = 0; l < levels; l++) {
    let cur: ErTable[] = [];
    let h = 0;
    for (const t of tables.filter((x) => level.get(x.name) === l)) {
      if (cur.length && h + boxHeight(t) + GAP_Y > MAX_COLUMN) {
        columns.push(cur);
        cur = [];
        h = 0;
      }
      cur.push(t);
      h += boxHeight(t) + GAP_Y;
    }
    if (cur.length) columns.push(cur);
  }
  const cols = columns.length;
  const colHeight = columns.map((c) => c.reduce((n, t) => n + boxHeight(t), 0) + Math.max(0, c.length - 1) * GAP_Y);
  const tallest = Math.max(0, ...colHeight);

  const boxes: Box[] = [];
  columns.forEach((col, ci) => {
    let y = MARGIN;
    for (const t of col) {
      boxes.push({ table: t, role: roleOf(t), level: ci, x: MARGIN + ci * (W + GAP_X), y, w: W, h: boxHeight(t) });
      y += boxHeight(t) + GAP_Y;
    }
  });
  const edges = routeEdges(boxes);

  return { boxes, edges, width: MARGIN * 2 + cols * W + (cols - 1) * GAP_X + 40, height: MARGIN * 2 + tallest };
}

/** Routes one elbow line per foreign key between the current box positions. */
export function routeEdges(boxes: Box[]): Edge[] {
  const box = new Map(boxes.map((b) => [b.table.name, b]));
  const edges: Edge[] = [];
  for (const c of boxes) {
    c.table.fields.forEach((f, fi) => {
      const p = f.ref && box.get(f.ref.table);
      if (!f.ref || !p) return;
      const pi = Math.max(0, p.table.fields.findIndex((x) => x.name === f.ref!.field));
      const y1 = rowY(p, pi), y2 = rowY(c, fi);
      let d: string, x1: number, x2: number, lx: number;
      const pd: 1 | -1 = 1;
      let cd: 1 | -1 = -1;
      if (p.x + p.w < c.x) {
        x1 = p.x + p.w; x2 = c.x;
        // Each line gets its own vertical lane in the gap so lines do not run on top of each other.
        const xm = x1 + Math.min(26 + (edges.length % 9) * 11, Math.max(8, (x2 - x1) / 2));
        d = elbow(x1, y1, xm, y2, x2);
        lx = xm;
      } else {
        // same column, a cycle or a dragged-over table: bracket out of the right edge and back in
        x1 = p.x + p.w; x2 = c.x + c.w;
        const out = Math.max(x1, x2) + 34;
        const yb = y1 === y2 ? y2 + 14 : y2;
        d = `M ${x1} ${y1} H ${out} V ${yb} H ${x2}`;
        lx = out; cd = 1;
      }
      // Label beside the vertical run, or above a straight line, clear of the "1" / "N" marks at the ends.
      const tall = Math.abs(y1 - y2) > 24;
      edges.push({
        from: p.table.name, to: c.table.name, toField: f.name, fromField: f.ref.field, label: f.name, color: colorOf(p.table.name),
        d, lx: tall ? lx + 6 : (x1 + x2) / 2, ly: tall ? (y1 + y2) / 2 + 3 : y1 - 6, la: tall ? "start" : "middle",
        p: { x: x1, y: y1, dir: pd }, c: { x: x2, y: y2, dir: cd },
      });
    });
  }
  return edges;
}

/** Layout with some tables moved by hand; lines are routed again for the new positions. */
export function withOffsets(base: Layout, moved: Readonly<Record<string, { x: number; y: number }>>): Layout {
  if (!Object.keys(moved).length) return base;
  const boxes = base.boxes.map((b) => (moved[b.table.name] ? { ...b, ...moved[b.table.name] } : b));
  const right = Math.max(...boxes.map((b) => b.x + b.w)) + MARGIN + 34;
  const bottom = Math.max(...boxes.map((b) => b.y + b.h)) + MARGIN;
  return { boxes, edges: routeEdges(boxes), width: Math.max(base.width, right), height: Math.max(base.height, bottom) };
}

const MERMAID_TYPE: Record<string, string> = {
  string: "string", integer: "int", number: "float", boolean: "boolean", date: "date", datetime: "datetime",
  uuid: "string", json: "json", enum: "string",
};
const id = (s: string) => s.replace(/\W/g, "_");

export function toMermaid(tables: ErTable[]): string {
  const names = new Set(tables.map((t) => t.name));
  const lines = ["erDiagram"];
  for (const t of tables)
    for (const f of t.fields)
      if (f.ref && names.has(f.ref.table)) lines.push(`  ${id(f.ref.table)} ${f.optional ? "|o" : "||"}--o{ ${id(t.name)} : "${f.name}"`);
  for (const t of tables) {
    lines.push(`  ${id(t.name)} {`);
    for (const f of t.fields) {
      const key = f.primary ? " PK" : f.ref ? " FK" : "";
      lines.push(`    ${MERMAID_TYPE[f.kind] ?? "string"} ${id(f.name)}${key}`);
    }
    lines.push("  }");
  }
  return lines.join("\n");
}
