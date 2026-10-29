import { forwardRef, useMemo, useRef } from "react";
import { HEADER, ROW, colorOf, layoutEr, type ErTable, type Layout } from "@/lib/er-layout";

const ROOT_STROKE = "hsl(14 75% 52%)";
const ROOT_FILL = "hsl(14 80% 55% / 0.1)";

export interface DiagramLabels { entity: string; root: string; join: string }

interface Props {
  tables: ErTable[];
  labels: DiagramLabels;
  layout?: Layout;
  scale?: number;
  /** Table the user clicked. Everything not connected to it fades back. */
  selected?: string | null;
  /** Tables matching the search box get a ring. */
  matches?: ReadonlySet<string>;
  onSelect?: (name: string | null) => void;
  /** Called while a table is dragged, with its new top-left corner in diagram units. */
  onMove?: (name: string, x: number, y: number) => void;
}

export const ErDiagram = forwardRef<SVGSVGElement, Props>(function ErDiagram(
  { tables, labels, layout, scale = 1, selected = null, matches, onSelect, onMove }, ref,
) {
  const drag = useRef<{ name: string; id: number; px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const { boxes, edges, groups, width, height } = layout ?? layoutEr(tables);

  // What the selection touches: connected tables and the key columns on both ends of each line.
  const focus = useMemo(() => {
    if (!selected) return null;
    const tablesHit = new Set<string>([selected]);
    const rows = new Set<string>();
    const lines = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from !== selected && e.to !== selected) return;
      lines.add(i);
      tablesHit.add(e.from);
      tablesHit.add(e.to);
      e.fromFields.forEach((n) => rows.add(`${e.from}.${n}`));
      e.toFields.forEach((n) => rows.add(`${e.to}.${n}`));
    });
    return { tablesHit, rows, lines };
  }, [selected, edges]);

  const ordered = edges.map((e, i) => ({ e, i })).sort((a, b) => Number(focus?.lines.has(a.i) ?? 0) - Number(focus?.lines.has(b.i) ?? 0));

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width * scale} height={height * scale}
      role="img" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" className="max-w-none text-foreground">
      <defs>
        <pattern id="er-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#er-dots)" onClick={() => onSelect?.(null)} />

      {groups.map((g) => (
        <g key={g.name} pointerEvents="none">
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="12" fill={g.color} fillOpacity="0.05" stroke={g.color} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="6 5" />
          <text x={g.x + 14} y={g.y + 18} fontSize="11" letterSpacing="1.4" fontWeight="600" fill={g.color}>{g.name.toUpperCase()}</text>
        </g>
      ))}

      {ordered.map(({ e, i }) => {
        const on = !focus || focus.lines.has(i);
        return (
          <g key={i} fill="none" style={{ opacity: on ? 1 : 0.07, transition: "opacity .15s" }} pointerEvents="none">
            <path d={e.d} stroke={e.color} strokeWidth={focus && on ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
            {e.pSpan && <path d={`M ${e.p.x} ${e.pSpan[0]} V ${e.pSpan[1]}`} stroke={e.color} strokeWidth="5" strokeLinecap="round" opacity="0.6" />}
            {e.cSpan && <path d={`M ${e.c.x} ${e.cSpan[0]} V ${e.cSpan[1]}`} stroke={e.color} strokeWidth="5" strokeLinecap="round" opacity="0.6" />}
            <circle cx={e.p.x} cy={e.p.y} r="4" fill={e.color} />
            <circle cx={e.c.x} cy={e.c.y} r="4" fill="var(--card)" stroke={e.color} strokeWidth="2" />
            <g fill="currentColor" fontSize="11" fontWeight="600">
              <text x={e.p.x + 9} y={e.p.y - 7} fill={e.color}>1</text>
              <text x={e.c.x + (e.c.dir === -1 ? -9 : 9)} y={e.c.y - 7} textAnchor={e.c.dir === -1 ? "end" : "start"} fill={e.color}>N</text>
              {focus && on && (
                <text x={e.lx} y={e.ly} textAnchor={e.la} fontSize="9" letterSpacing="1" fontWeight="500" fill={e.color} stroke="var(--card)" strokeWidth="3" paintOrder="stroke">{e.label.toUpperCase()}</text>
              )}
            </g>
          </g>
        );
      })}

      {boxes.map((b, bi) => {
        const root = b.role === "root", join = b.role === "join";
        const accent = colorOf(b.table.name);
        const stroke = root ? ROOT_STROKE : "currentColor";
        const tag = root ? `${labels.entity} · ${labels.root}` : join ? labels.join : labels.entity;
        const isSel = selected === b.table.name;
        const dim = (focus && !focus.tablesHit.has(b.table.name)) || (matches && matches.size > 0 && !matches.has(b.table.name) && !focus);
        const hit = matches?.has(b.table.name);
        return (
          <g key={`${bi}:${b.table.name}`} data-table={b.table.name} style={{ opacity: dim ? 0.18 : 1, transition: "opacity .15s", cursor: onMove ? "grab" : "pointer" }}
            onPointerDown={(ev) => {
              if (!onMove || ev.button !== 0) return;
              ev.stopPropagation();
              drag.current = { name: b.table.name, id: ev.pointerId, px: ev.clientX, py: ev.clientY, x: b.x, y: b.y, moved: false };
            }}
            onPointerMove={(ev) => {
              const d = drag.current;
              if (!d || d.id !== ev.pointerId) return;
              const dx = (ev.clientX - d.px) / scale, dy = (ev.clientY - d.py) / scale;
              if (!d.moved) {
                if (Math.hypot(dx, dy) * scale < 4) return;
                d.moved = true;
                ev.currentTarget.setPointerCapture(ev.pointerId);
              }
              onMove?.(d.name, Math.max(0, d.x + dx), Math.max(0, d.y + dy));
            }}
            onPointerUp={(ev) => {
              const d = drag.current;
              if (!d || d.id !== ev.pointerId) return;
              if (d.moved) ev.currentTarget.releasePointerCapture(ev.pointerId);
              // keep `moved` for the click that follows, then clear it
              setTimeout(() => { if (drag.current === d) drag.current = null; });
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              if (drag.current?.moved) return;
              onSelect?.(isSel ? null : b.table.name);
            }}>
            {(isSel || hit) && <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} rx="10" fill="none" stroke={accent} strokeWidth="2" opacity="0.55" />}
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={root ? ROOT_FILL : "var(--card)"}
              stroke={isSel ? accent : stroke} strokeWidth={isSel ? 2.5 : root ? 1.5 : 1.25} strokeDasharray={join ? "5 4" : undefined} />
            <rect x={b.x + 1} y={b.y + 1} width={b.w - 2} height={HEADER - 1} rx="5" fill={join ? "var(--muted)" : "currentColor"} opacity={join ? 1 : 0.05} />
            <rect x={b.x + 1} y={b.y + 1} width="5" height={HEADER - 1} rx="2.5" fill={accent} />
            <text x={b.x + 18} y={b.y + 19} fontSize="9" letterSpacing="1.4" fill={root ? ROOT_STROKE : "currentColor"} opacity={root ? 1 : 0.55}>
              {tag.toUpperCase()}
            </text>
            <text x={b.x + 18} y={b.y + 38} fontSize="16" fontWeight="600" fill="currentColor" fontFamily="ui-sans-serif, system-ui, sans-serif">{b.table.name}</text>
            <line x1={b.x} x2={b.x + b.w} y1={b.y + HEADER} y2={b.y + HEADER} stroke={stroke} strokeWidth="1" opacity="0.4" />
            {b.table.fields.map((f, i) => {
              const hot = focus?.rows.has(`${b.table.name}.${f.name}`);
              const ry = b.y + HEADER + i * ROW;
              return (
                <g key={`${i}:${f.name}`} fontSize="12" fill="currentColor">
                  {hot && <rect x={b.x + 7} y={ry + 1} width={b.w - 14} height={ROW - 2} rx="4" fill={accentFor(b.table.name, f.name, edges, focus?.lines)} opacity="0.22" />}
                  <text x={b.x + 16} y={ry + ROW / 2 + 5} fontWeight={f.primary || hot ? 700 : 400}>
                    {f.primary ? "# " : f.ref ? "→ " : ""}{f.name}{f.optional ? "?" : ""}
                  </text>
                  <text x={b.x + b.w - 16} y={ry + ROW / 2 + 5} textAnchor="end" opacity="0.55">{f.kind}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
});

/** Colour of the line that touches a highlighted key column. */
function accentFor(table: string, field: string, edges: Layout["edges"], lines?: Set<number>): string {
  for (const i of lines ?? []) {
    const e = edges[i];
    if ((e.from === table && e.fromFields.includes(field)) || (e.to === table && e.toFields.includes(field))) return e.color;
  }
  return "currentColor";
}

export type { ErTable };
