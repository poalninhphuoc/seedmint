"use client";

import { ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet, Pencil, Plus, RefreshCw, Save, Search, Table2, Trash2, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useUrlState } from "@/lib/url-state";
import { generate } from "@/app/actions";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useErrorText } from "@/hooks/use-error-text";
import {
  choices, coerce, deleteRow, fromPreview, insertRow, isAutoId, kindOf, loadDataset, nextId, referencing, saveDataset, toCsv, toJson, updateRow,
  type Cell, type DataTable, type Dataset,
} from "@/lib/dataset";
import { StorageWarning } from "@/components/storage-warning";
import { downloadFile } from "@/lib/download";
import { addVersion } from "@/lib/history";
import { colorOf } from "@/lib/er-layout";
import { SAMPLE_SCHEMA, loadSchema, loadSettings, type StudioSettings } from "@/lib/studio-state";

const PAGE = 25;
const MAX_GENERATED = 200;
const EMPTY = "__empty";

/** What the Sheet is doing: adding a row, or editing the row at `at`. */
interface Form { mode: "add" | "edit"; at: number; values: string[]; errors: Record<number, boolean> }

const show = (v: Cell) => (v === null ? "" : String(v));

export function DataAdmin() {
  const t = useTranslations("dataPage");
  const errorText = useErrorText();
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [settings, setSettings] = useState<Partial<StudioSettings>>({});
  const [data, setData] = useState<Dataset | null>(null);
  const [loaded, setLoaded] = useState(false);
  const url = useUrlState();
  // The open table, search text and page live in the URL: reload or Back comes back to the same view.
  const name = url.params.get("table");
  const query = url.params.get("q") ?? "";
  const page = Math.max(0, (Number(url.params.get("page")) || 1) - 1);
  const setName = (n: string | null) => url.set({ table: n }, "push");
  const setQuery = (q: string) => url.set({ q }, "replace");
  const setPage = (n: number) => url.set({ page: n > 0 ? String(n + 1) : null }, "replace");
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    setSchema(loadSchema() ?? SAMPLE_SCHEMA);
    setSettings(loadSettings());
    const d = loadDataset();
    setData(d);
    setLoaded(true);
  }, []);

  const table = data?.tables.find((x) => x.name === name) ?? data?.tables[0] ?? null;
  const stale = !!data && data.schema !== schema;

  const commit = (next: Dataset) => {
    setData(next);
    saveDataset(next);
  };

  const build = () =>
    start(async () => {
      setError(null);
      const clamp = (n: number) => Math.min(n, MAX_GENERATED);
      const r = await generate({
        schema, from: settings.from ?? "auto", locale: settings.locale ?? "en", rows: clamp(settings.rows ?? 25),
        tableRows: Object.fromEntries(Object.entries(settings.tableRows ?? {}).map(([k, n]) => [k, clamp(n)])),
        seed: settings.seed ?? 42, format: "json", edgeCases: settings.edgeCases ?? false, dialect: "postgres", ddl: false,
        regional: false, region: { date: "yyyy-MM-dd", decimal: ".", thousands: "," },
      });
      if (!r.ok) return setError(r.error);
      const d = fromPreview(schema, r.preview);
      if (!d) return setError("TOO_LARGE");
      commit(d);
      url.set({ table: d.tables[0]?.name ?? null, q: null, page: null }, "replace");
    });

  const pick = (n: string) => {
    url.set({ table: n, q: null, page: null });
    setError(null);
  };

  const needle = query.trim().toLowerCase();
  // Rows keep their position in the table: edits and deletes address them by it.
  const shown = useMemo(() => {
    if (!table) return [];
    const all = table.rows.map((row, at) => ({ row, at }));
    return needle ? all.filter(({ row }) => row.some((v) => v !== null && String(v).toLowerCase().includes(needle))) : all;
  }, [table, needle]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PAGE, current * PAGE + PAGE);

  const openAdd = () => {
    if (!table) return;
    setForm({ mode: "add", at: -1, values: table.columns.map((_, j) => (isAutoId(table, j) ? String(nextId(table, j)) : "")), errors: {} });
  };
  const openEdit = (at: number) => table && setForm({ mode: "edit", at, values: table.rows[at].map(show), errors: {} });

  const submit = () => {
    if (!form || !table || !data) return;
    const cells = table.columns.map((_, j) => coerce(form.values[j], kindOf(table, j)));
    const errors = Object.fromEntries(cells.flatMap((c, j) => (c === undefined ? [[j, true]] : [])));
    if (Object.keys(errors).length) return setForm({ ...form, errors });
    const row = cells as Cell[];
    commit(form.mode === "add" ? insertRow(data, table.name, row) : updateRow(data, table.name, form.at, row));
    if (form.mode === "add") setPage(Math.floor(table.rows.length / PAGE));
    setForm(null);
  };

  const remove = (at: number) => {
    if (!table || !data) return;
    const used = referencing(data, table.name, at);
    if (used.length) return setError(`BLOCKED:${used.map((u) => `${u.table} (${u.count})`).join(", ")}`);
    setError(null);
    commit(deleteRow(data, table.name, at));
  };

  const saveVersion = () => {
    if (!data) return;
    addVersion({
      kind: "save", now: data.at.slice(0, 10), settings: fullSettings(settings), schema: data.schema, tables: data.tables.map((x) => x.name),
      rows: data.tables.reduce((n, x) => n + x.rows.length, 0), files: [], data,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const exportCsv = (x: DataTable) => downloadFile({ name: `${x.name}.csv`, content: toCsv(x) });
  const exportJson = () => data && downloadFile({ name: "data.json", content: toJson(data) });

  const message = !error ? null : error === "TOO_LARGE" ? t("tooLarge", { max: MAX_GENERATED })
    : error.startsWith("BLOCKED:") ? t("blocked", { list: error.slice(8) })
    : errorText(error);

  return (
    <>
      <PageHeader
        icon={<Table2 />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button variant={data ? "outline" : "default"} disabled={busy || !loaded} onClick={() => (!data || confirm(t("regenerateConfirm"))) && build()}>
              {data ? <RefreshCw className={busy ? "animate-spin" : ""} /> : <WandSparkles />}{data ? t("regenerate") : t("generate")}
            </Button>
            <Button variant="outline" disabled={!data} onClick={saveVersion}><Save />{saved ? t("saved") : t("saveVersion")}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" disabled={!data}><Download />{t("export")}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!table} onSelect={() => table && exportCsv(table)}><FileSpreadsheet />{t("exportCsv", { table: table?.name ?? "" })}</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportJson}><FileJson />{t("exportJson")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <StorageWarning />
      {message && <p role="alert" className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:mx-6">{message}</p>}
      {stale && <p className="m-4 rounded-lg bg-amber-500/10 p-3 text-sm md:mx-6">{t("stale")}</p>}
      {!data ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{loaded ? t("empty") : null}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label={t("tablesTitle")} className="max-h-48 shrink-0 overflow-y-auto border-b md:max-h-none md:w-56 md:border-b-0 md:border-r">
            <ul className="divide-y">
              {data.tables.map((x) => (
                <li key={x.name}>
                  <button type="button" onClick={() => pick(x.name)} aria-current={x.name === table?.name ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-muted/60 ${x.name === table?.name ? "bg-muted font-medium" : ""}`}>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(x.name) }} />
                    <span className="min-w-0 flex-1 truncate">{x.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{x.rows.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {table && (
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 md:px-6">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => url.set({ q: e.target.value, page: null }, "replace")} placeholder={t("search")} aria-label={t("search")} className="bg-card pl-9" />
                </div>
                <span className="text-sm text-muted-foreground">{t("rowsCount", { count: shown.length })}</span>
                <Button size="sm" className="ml-auto" onClick={openAdd}><Plus />{t("add")}</Button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr>
                      {table.columns.map((c, j) => (
                        <th key={c} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold first:pl-4 md:first:pl-6">
                          {c}{table.refs[j] && <span className="ml-1 font-normal text-muted-foreground">→ {table.refs[j]!.table}</span>}
                        </th>
                      ))}
                      <th className="w-24 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {slice.map(({ row, at }) => (
                      <tr key={at} className="hover:bg-muted/50" onDoubleClick={() => openEdit(at)}>
                        {row.map((v, j) => (
                          <td key={j} title={v === null ? undefined : String(v)}
                            className={`max-w-[18rem] truncate whitespace-nowrap px-3 py-2.5 first:pl-4 md:first:pl-6 ${typeof v === "number" ? "text-right tabular-nums" : ""}`}>
                            {v === null ? <span className="text-muted-foreground">–</span> : String(v)}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-1 text-right">
                          <IconButton variant="ghost" label={t("edit")} onClick={() => openEdit(at)}><Pencil /></IconButton>
                          <IconButton variant="ghost" label={t("delete")} onClick={() => remove(at)}><Trash2 /></IconButton>
                        </td>
                      </tr>
                    ))}
                    {slice.length === 0 && <tr><td colSpan={table.columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">{t("noRows")}</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 border-t bg-card/60 px-4 py-2 text-sm md:px-6">
                <span className="tabular-nums text-muted-foreground">{current + 1} / {pages}</span>
                <IconButton variant="ghost" label={t("previous")} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></IconButton>
                <IconButton variant="ghost" label={t("next")} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ChevronRight /></IconButton>
              </div>
            </section>
          )}
        </div>
      )}

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {form && table && data && (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex min-h-full flex-col">
              <SheetHeader>
                <SheetTitle>{t(form.mode === "add" ? "addTitle" : "editTitle", { table: table.name })}</SheetTitle>
                <SheetDescription>{t("formHint")}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 px-4">
                {table.columns.map((c, j) => {
                  const ref = table.refs[j];
                  const kind = kindOf(table, j);
                  const auto = isAutoId(table, j);
                  const options = ref ? choices(data, ref) : kind === "boolean" ? [true, false] : [];
                  const set = (v: string) => setForm((f) => f && { ...f, values: f.values.map((x, i) => (i === j ? v : x)), errors: { ...f.errors, [j]: false } });
                  return (
                    <div key={c} className="space-y-1.5">
                      <label htmlFor={`f-${j}`} className="flex items-baseline gap-2 text-sm font-medium">
                        {c}
                        <span className="text-xs font-normal text-muted-foreground">{ref ? `→ ${ref.table}.${ref.field}` : kind}{auto ? ` · ${t("auto")}` : ""}</span>
                      </label>
                      {options.length ? (
                        <Select value={form.values[j] === "" ? EMPTY : form.values[j]} onValueChange={(v) => set(v === EMPTY ? "" : v)}>
                          <SelectTrigger id={`f-${j}`} className="w-full bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY}>{t("emptyValue")}</SelectItem>
                            {options.map((o) => <SelectItem key={String(o)} value={String(o)}>{String(o)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input id={`f-${j}`} value={form.values[j]} disabled={auto} inputMode={kind === "number" ? "decimal" : undefined}
                          aria-invalid={form.errors[j] || undefined} onChange={(e) => set(e.target.value)} className="bg-card" />
                      )}
                      {form.errors[j] && <p role="alert" className="text-xs text-destructive">{t("invalid", { kind })}</p>}
                    </div>
                  );
                })}
              </div>
              <SheetFooter className="flex-row justify-end">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>{t("cancel")}</Button>
                <Button type="submit">{t("save")}</Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Studio's settings with defaults for whatever was never saved, so a version can be opened in Studio later. */
function fullSettings(s: Partial<StudioSettings>): StudioSettings {
  return {
    from: "auto", locale: "en", rows: 25, tableRows: {}, seed: 42, format: "json", edgeCases: false, dialect: "postgres", ddl: false,
    regional: false, region: { date: "yyyy-MM-dd", decimal: ".", thousands: "," }, ...s,
  };
}
