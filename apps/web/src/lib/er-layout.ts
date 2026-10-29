export interface ErField {
  name: string;
  kind: string;
  primary?: boolean;
  optional?: boolean;
  ref?: { table: string; field: string; group?: string };
}
export interface ErTable { name: string; /** Schema or module; two or more distinct values cluster the diagram. */ group?: string; fields: ErField[] }
export type Role = "root" | "entity" | "join";

export interface Box { table: ErTable; role: Role; level: number; x: number; y: number; w: number; h: number }
export interface Edge {
  from: string;
  to: string;
  /** Foreign key column on the child table, and the key it points at on the parent. */
  toField: string;
  fromField: string;
  /** All key columns of the line: more than one for a composite foreign key (same order on both ends). */
  toFields: string[];
  fromFields: string[];
  /** Vertical extent of the key rows on each end, set only for a composite key (drawn as a bracket). */
  pSpan?: [number, number];
  cSpan?: [number, number];
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
/** Frame drawn around the tables of one schema or module. */
export interface GroupFrame { name: string; x: number; y: number; w: number; h: number; color: string }
export interface Layout { boxes: Box[]; edges: Edge[]; groups: GroupFrame[]; width: number; height: number }

export const W = 250;
export const HEADER = 50;
export const ROW = 24;
const PAD_BOTTOM = 12;
const GAP_X = 130;
const GAP_Y = 44;
const MARGIN = 36;
const MAX_COLUMN = 2600;
const FRAME_PAD = 14;
const FRAME_LABEL = 26;
const CLUSTER_GAP = 30;

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
  // With two or more schemas/modules each one is arranged on its own and the clusters are stacked.
  const names = [...new Set(tables.map((t) => t.group).filter((g): g is string => !!g))];
  const clusters = names.length >= 2 ? [...names.map((g) => tables.filter((t) => t.group === g)), tables.filter((t) => !t.group)].filter((c) => c.length) : [tables];
  const boxes: Box[] = [];
  let maxCols = 0;
  let top = MARGIN;
  for (const subset of clusters) {
    if (clusters.length > 1 && subset[0].group) top += FRAME_LABEL + FRAME_PAD;
    const levelsHere = [...new Set(subset.map((t) => level.get(t.name)!))].sort((a, b) => a - b);
    const columns: ErTable[][] = [];
    for (const l of levelsHere) {
      let cur: ErTable[] = [];
      let h = 0;
      for (const t of subset.filter((x) => level.get(x.name) === l)) {
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
    maxCols = Math.max(maxCols, columns.length);
    let bottom = top;
    columns.forEach((col, ci) => {
      let y = top;
      for (const t of col) {
        boxes.push({ table: t, role: roleOf(t), level: ci, x: MARGIN + ci * (W + GAP_X), y, w: W, h: boxHeight(t) });
        y += boxHeight(t) + GAP_Y;
      }
      bottom = Math.max(bottom, y - GAP_Y);
    });
    top = bottom + FRAME_PAD + CLUSTER_GAP;
  }
  const edges = routeEdges(boxes);
  const bottom = Math.max(MARGIN, ...boxes.map((b) => b.y + b.h));

  return { boxes, edges, groups: frames(boxes), width: MARGIN * 2 + maxCols * W + (maxCols - 1) * GAP_X + 40, height: bottom + MARGIN };
}

/** One frame per schema/module around its current boxes; none unless at least two exist. */
export function frames(boxes: Box[]): GroupFrame[] {
  const by = new Map<string, Box[]>();
  for (const b of boxes) if (b.table.group) by.set(b.table.group, [...(by.get(b.table.group) ?? []), b]);
  if (by.size < 2) return [];
  return [...by].map(([name, bs]) => {
    const x = Math.min(...bs.map((b) => b.x)) - FRAME_PAD, y = Math.min(...bs.map((b) => b.y)) - FRAME_PAD - FRAME_LABEL;
    return { name, x, y, w: Math.max(...bs.map((b) => b.x + b.w)) + FRAME_PAD - x, h: Math.max(...bs.map((b) => b.y + b.h)) + FRAME_PAD - y, color: colorOf(name) };
  });
}

/** Routes one elbow line per foreign key between the current box positions. */
export function routeEdges(boxes: Box[]): Edge[] {
  const box = new Map(boxes.map((b) => [b.table.name, b]));
  const edges: Edge[] = [];
  for (const c of boxes) {
    const seen = new Set<string>();
    c.table.fields.forEach((f, fi) => {
      const p = f.ref && box.get(f.ref.table);
      if (!f.ref || !p) return;
      // Columns of one composite foreign key become a single line anchored at the middle of their rows.
      const group = f.ref.group;
      if (group) {
        if (seen.has(group)) return;
        seen.add(group);
      }
      const members = group ? c.table.fields.flatMap((x, xi) => (x.ref?.group === group && x.ref.table === f.ref!.table ? [{ x, xi }] : [])) : [{ x: f, xi: fi }];
      const childRows = members.map((m) => rowY(c, m.xi));
      const parentRows = members.map((m) => rowY(p, Math.max(0, p.table.fields.findIndex((x) => x.name === m.x.ref!.field))));
      const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2;
      const y1 = mid(parentRows), y2 = mid(childRows);
      const multi = members.length > 1;
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
        from: p.table.name, to: c.table.name, toField: f.name, fromField: f.ref.field, label: members.map((m) => m.x.name).join(" + "), color: colorOf(p.table.name),
        toFields: members.map((m) => m.x.name), fromFields: members.map((m) => m.x.ref!.field),
        pSpan: multi ? [Math.min(...parentRows), Math.max(...parentRows)] : undefined,
        cSpan: multi ? [Math.min(...childRows), Math.max(...childRows)] : undefined,
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
  return { boxes, edges: routeEdges(boxes), groups: frames(boxes), width: Math.max(base.width, right), height: Math.max(base.height, bottom) };
}

const overlaps = (a: Box, b: Box, pad: number) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Hand-placed tables keep absolute positions, so they can end up on top of a neighbour: after the base layout shifts
 * (a table hidden or shown, the schema edited) or when one is dropped on another. This moves each hand-placed table
 * straight down to the first free spot; tables of the automatic layout never move. `last` is settled after the rest.
 */
export function settleMoved(base: Layout, moved: Readonly<Record<string, { x: number; y: number }>>, last?: string): Record<string, { x: number; y: number }> {
  const names = Object.keys(moved).filter((n) => base.boxes.some((b) => b.table.name === n));
  if (last && names.includes(last)) names.push(...names.splice(names.indexOf(last), 1));
  const boxes = base.boxes.map((b) => ({ ...b, ...(moved[b.table.name] ?? {}) }));
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of names) {
    const b = boxes.find((x) => x.table.name === n)!;
    for (let guard = 0; guard < boxes.length * 4; guard++) {
      const hit = boxes.filter((o) => o !== b && overlaps(b, o, GAP_Y / 2)).sort((p, q) => q.y + q.h - (p.y + p.h))[0];
      if (!hit) break;
      b.y = hit.y + hit.h + GAP_Y;
    }
    out[n] = { x: b.x, y: b.y };
  }
  return out;
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
      if (f.ref && names.has(f.ref.table) && !(f.ref.group && t.fields.find((x) => x.ref?.group === f.ref!.group) !== f))
        lines.push(`  ${id(f.ref.table)} ${f.optional ? "|o" : "||"}--o{ ${id(t.name)} : "${f.name}"`);
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
