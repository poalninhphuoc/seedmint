"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewTable } from "@/app/actions";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SIZES = [10, 25, 50, 100];
type Cell = PreviewTable["rows"][number][number];

const compare = (a: Cell, b: Cell) => {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

export interface GridFocus { column: string; value: Cell }

/**
 * Table preview: search, sortable header, and a footer with the record count, page size and pages.
 * A foreign-key cell is a link (`onFollow`); `focus` outlines the row a link led to and opens its page.
 */
export function DataGrid({ table, focus = null, onFollow, lookup }: {
  table: PreviewTable;
  focus?: GridFocus | null;
  onFollow?: (table: string, column: string, value: Cell) => void;
  /** The row a foreign key points at, for the hover card. */
  lookup?: (table: string, column: string, value: Cell) => { columns: string[]; row: Cell[] } | null;
}) {
  const t = useTranslations("studio");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [size, setSize] = useState(25);
  const target = useMemo(() => {
    const col = focus ? table.columns.indexOf(focus.column) : -1;
    const at = col < 0 ? -1 : table.rows.findIndex((r) => String(r[col]) === String(focus!.value));
    return at < 0 ? null : { row: table.rows[at], at };
  }, [focus, table]);
  const [page, setPage] = useState(() => (target ? Math.floor(target.at / 25) : 0));
  const hl = useRef<HTMLTableRowElement>(null);

  // Following a link clears search and sorting so the row sits on its natural page.
  useEffect(() => {
    if (!target) return;
    setQ("");
    setSort(null);
    setPage(Math.floor(target.at / size));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle ? table.rows.filter((r) => r.some((v) => v !== null && String(v).toLowerCase().includes(needle))) : table.rows;
    if (sort) out = [...out].sort((a, b) => sort.dir * compare(a[sort.col], b[sort.col]));
    return out;
  }, [table.rows, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * size, current * size + size);
  const total = q ? rows.length : table.total;

  useEffect(() => {
    hl.current?.scrollIntoView({ block: "center" });
  }, [target, current]);

  const toggle = (col: number) =>
    setSort((s) => (s?.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));

  const window = Array.from({ length: Math.min(5, pages) }, (_, i) => Math.min(Math.max(0, current - 2), Math.max(0, pages - 5)) + i);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2 md:px-6">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t("search")} aria-label={t("search")} className="bg-card pl-9" />
        </div>
      </div>

      <div className="max-h-[70svh] min-h-0 flex-1 overflow-auto lg:max-h-none">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              {table.columns.map((c, i) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold first:pl-4 md:first:pl-6">
                  <button type="button" onClick={() => toggle(i)} className="inline-flex items-center gap-1 hover:text-foreground">
                    {c}
                    {sort?.col === i ? (sort.dir === 1 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />) : <ArrowUpDown className="size-3.5 text-muted-foreground/60" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {slice.map((r, i) => {
              const on = target?.row === r;
              return (
                <tr key={i} ref={on ? hl : undefined} data-focus={on || undefined}
                  className={cn("hover:bg-muted/50", on && "bg-brand/10 outline-2 -outline-offset-2 outline-brand")}>
                  {r.map((v, j) => {
                    const ref = table.refs?.[j];
                    return (
                      <td key={j} title={v === null || ref ? undefined : String(v)}
                        className={cn("max-w-[18rem] truncate whitespace-nowrap px-3 py-2.5 first:pl-4 md:first:pl-6", typeof v === "number" && "text-right tabular-nums")}>
                        {v === null ? <span className="text-muted-foreground">–</span>
                          : ref && onFollow ? (
                            <HoverCard openDelay={150} closeDelay={80}>
                              <HoverCardTrigger asChild>
                                <button type="button" onClick={() => onFollow(ref.table, ref.field, v)}
                                  className="text-brand underline decoration-dotted underline-offset-4 hover:decoration-solid">
                                  {String(v)}
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent>
                                <RefCard title={t("followRef", { table: ref.table })} found={lookup?.(ref.table, ref.field, v) ?? null} empty={t("refMissing")} />
                              </HoverCardContent>
                            </HoverCard>
                          ) : String(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr><td colSpan={table.columns.length} className="px-4 py-10 text-center text-muted-foreground">{t("noMatches")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card/60 px-4 py-2.5 text-sm md:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-muted-foreground">{t("total")} <b className="text-foreground tabular-nums">{total}</b> {t("records")}</span>
          <label className="flex items-center gap-2 text-muted-foreground">
            {t("perPage")}
            <Select value={String(size)} onValueChange={(v) => { setSize(Number(v)); setPage(0); }}>
              <SelectTrigger size="sm" className="w-20 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {t("perPageSuffix")}
          </label>
          {table.total > table.rows.length && <span className="text-xs text-muted-foreground">{t("previewCap", { count: table.rows.length })}</span>}
        </div>
        <nav className="flex items-center gap-1" aria-label={t("pagination.label")}>
          <PageButton tip label={t("pagination.first")} disabled={current === 0} onClick={() => setPage(0)}><ChevronsLeft /></PageButton>
          <PageButton tip label={t("pagination.previous")} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></PageButton>
          {window.map((p) => (
            <PageButton key={p} label={String(p + 1)} active={p === current} onClick={() => setPage(p)}>{p + 1}</PageButton>
          ))}
          <PageButton tip label={t("pagination.next")} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ChevronRight /></PageButton>
          <PageButton tip label={t("pagination.last")} disabled={current >= pages - 1} onClick={() => setPage(pages - 1)}><ChevronsRight /></PageButton>
        </nav>
      </div>
    </div>
  );
}

/** Key columns and values of the row a foreign key points at. */
function RefCard({ title, found, empty }: { title: string; found: { columns: string[]; row: Cell[] } | null; empty: string }) {
  return (
    <div className="space-y-2 text-[13px]">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {found ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {found.columns.map((c, i) => (
            <div key={c} className="contents">
              <dt className="text-muted-foreground">{c}</dt>
              <dd className="min-w-0 break-words">{found.row[i] === null ? <span className="text-muted-foreground">–</span> : String(found.row[i])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function PageButton({ children, label, active, disabled, onClick, tip }: {
  children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void; tip?: boolean;
}) {
  const button = (
    <button type="button" aria-label={label} aria-current={active ? "page" : undefined} disabled={disabled} onClick={onClick}
      className={cn("flex size-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors [&_svg]:size-4",
        active ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40")}>
      {children}
    </button>
  );
  if (!tip) return button;
  // a disabled button swallows pointer events, so the tooltip hangs on a wrapper
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
