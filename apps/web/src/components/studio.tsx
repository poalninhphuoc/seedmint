"use client";

import { Check, ChevronRight, Copy, Dices, Download, FlaskConical, FolderOpen, Link2, Sparkles, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { analyze, generate, importFiles, type AnalyzeResult, type CellEdits, type GenerateResult, type ImportedFile, type OutputFile } from "@/app/actions";
import { DataGrid, type TableEdits } from "@/components/data-grid";
import { DropZone } from "@/components/drop-zone";
import { ExportMenu } from "@/components/export-menu";
import { FileTree } from "@/components/file-tree";
import { PageHeader } from "@/components/page-header";
import { useErrorText } from "@/hooks/use-error-text";
import { IconButton } from "@/components/icon-button";
import { SampleMenu } from "@/components/sample-menu";
import { SplitView } from "@/components/split-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { downloadFile } from "@/lib/download";
import { folderInputProps, readFolder } from "@/lib/folder";
import {
  DATE_PATTERNS, DECIMALS, DIALECT_LABELS, EXPORT_FORMATS, THOUSANDS, regionExample, type ExportFormat,
} from "@/lib/formats";
import { addHistory } from "@/lib/history";
import { MAX_LINK, readShareHash, shareHash } from "@/lib/share";
import { SAMPLE_SCHEMA, loadSchema, loadSettings, loadView, saveSchema, saveSettings, saveView, type StudioSettings, type StudioView } from "@/lib/studio-state";
import type { RegionFormat, SqlDialect } from "@seedmint/core";

const AUTO_KEY = "seedmint:auto";
const INPUTS = ["ts", "zod", "sql", "dsl", "json", "prisma", "drizzle", "jsonschema", "dbml", "graphql", "openapi", "csv"] as const;
export function Studio({ locales, regions, initialLocale }: {
  locales: { code: string; label: string }[];
  regions: Record<string, RegionFormat>;
  initialLocale: string;
}) {
  const t = useTranslations("studio");
  const errorText = useErrorText();
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [settings, setSettings] = useState<StudioSettings>({
    from: "auto", locale: initialLocale, rows: 10, tableRows: {}, seed: 42, format: "json", edgeCases: false,
    dialect: "postgres", ddl: true, regional: true, region: regions[initialLocale] ?? regions.en,
  });
  const [info, setInfo] = useState<AnalyzeResult | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [imported, setImported] = useState<{ count: number; format: string; skipped: number; files: ImportedFile[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [tab, setTab] = useState("output");
  const [focus, setFocus] = useState<StudioView["focus"]>(null);
  const [restore, setRestore] = useState<StudioView | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [auto, setAuto] = useState(false);
  const [shared, setShared] = useState<"ok" | "long" | null>(null);
  const [took, setTook] = useState<{ ms: number; seed: number } | null>(null);
  const hasResult = useRef(false);
  const [edits, setEdits] = useState<CellEdits>({});
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const sharedLink = useRef<ReturnType<typeof readShareHash>>(null);
  const ready = useRef(false);
  const folder = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<StudioSettings>) => setSettings((s) => ({ ...s, ...patch }));

  useEffect(() => {
    const saved = loadSchema();
    if (saved) setSchema(saved);
    const s = loadSettings();
    if (Object.keys(s).length) setSettings((cur) => ({ ...cur, ...s, region: { ...cur.region, ...s.region } }));
    // A reload comes back to the same screen: the data is rebuilt from the saved schema, settings and seed.
    const v = loadView();
    if (v?.generated) setRestore(v);
    else setViewReady(true);
    try { setAuto(localStorage.getItem(AUTO_KEY) === "1"); } catch { /* storage can be blocked */ }
    // A shared link wins over what is saved in this browser.
    // Kept in a ref: React may run this effect twice in development, and the hash is cleared after the first run.
    const shared = (sharedLink.current ??= readShareHash(location.hash));
    if (shared) {
      setSchema(shared.schema!);
      setSettings((cur) => ({
        ...cur,
        from: shared.from ?? "auto", locale: shared.locale ?? cur.locale, rows: shared.rows ?? cur.rows,
        seed: shared.seed ?? cur.seed, format: shared.format ?? cur.format, tableRows: {},
      }));
      history.replaceState(null, "", location.pathname + location.search);
    }
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!restore) return;
    const v = restore;
    setRestore(null);
    start(async () => {
      const r = await generate(input(settings.format));
      setResult(r);
      if (r.ok && r.preview.some((p) => `t:${p.name}` === v.tab)) {
        setTab(v.tab);
        setFocus(v.focus);
      } else if (r.ok) setTab(r.preview[0] ? `t:${r.preview[0].name}` : "output");
      setViewReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore]);
  useEffect(() => {
    if (viewReady) saveView({ tab, focus, generated: result?.ok === true });
  }, [viewReady, tab, focus, result]);
  useEffect(() => {
    if (ready.current) saveSchema(schema);
  }, [schema]);
  useEffect(() => {
    if (ready.current) saveSettings(settings);
  }, [settings]);

  // Keep the table list in step with the schema text.
  useEffect(() => {
    const id = setTimeout(async () => {
      const r = await analyze({ schema, from: settings.from });
      setInfo(r.ok ? r : null);
      setSchemaError(r.ok ? null : r.error);
    }, 400);
    return () => clearTimeout(id);
  }, [schema, settings.from]);

  const input = useCallback(
    (format: ExportFormat, bundle = false, dialect?: SqlDialect) => ({ schema, ...settings, format, bundle, dialect: dialect ?? settings.dialect, edits: editsRef.current }),
    [schema, settings],
  );

  const run = (patch?: Partial<StudioSettings>) =>
    start(async () => {
      const s = { ...settings, ...patch };
      if (patch) set(patch);
      const t0 = performance.now();
      const r = await generate({ schema, ...s, bundle: false, edits: patch ? {} : editsRef.current });
      setResult(r);
      if (!r.ok) return;
      setTook({ ms: Math.round(performance.now() - t0), seed: s.seed });
      setTab(r.preview[0] ? `t:${r.preview[0].name}` : "output");
      setFocus(null);
      addHistory({
        kind: "generate", now: r.now, settings: s, schema, tables: r.tables.length,
        rows: r.tables.reduce((n, x) => n + x.rows, 0), files: r.files.map((f) => f.name),
      });
    });

  // Auto mode: once data exists, rebuild it shortly after the schema or a setting changes. The open tab stays put.
  useEffect(() => { hasResult.current = result?.ok === true; }, [result]);
  useEffect(() => {
    if (!auto || !ready.current || !hasResult.current) return;
    const id = setTimeout(() => start(async () => {
      const t0 = performance.now();
      const r = await generate(input(settings.format));
      setResult(r);
      if (r.ok) setTook({ ms: Math.round(performance.now() - t0), seed: settings.seed });
    }), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, schema, settings]);

  // Edits are tied to row numbers of one particular run, so a new schema, seed or row count drops them.
  const runKey = JSON.stringify([schema, settings.from, settings.locale, settings.rows, settings.tableRows, settings.seed, settings.edgeCases]);
  const lastKey = useRef(runKey);
  useEffect(() => {
    if (lastKey.current === runKey) return;
    lastKey.current = runKey;
    if (Object.keys(editsRef.current).length) setEdits({});
  }, [runKey]);

  const editCell = (table: string, row: number, column: string, text: string, current: string | number | boolean | null) => {
    const low = text.trim().toLowerCase();
    let value: string | number | boolean | null = text;
    if (text === "") value = null;
    else if (typeof current === "number" && text.trim() !== "" && Number.isFinite(Number(text))) value = Number(text);
    else if (typeof current === "boolean" && ["true", "1", "yes"].includes(low)) value = true;
    else if (typeof current === "boolean" && ["false", "0", "no"].includes(low)) value = false;
    const next: CellEdits = { ...editsRef.current, [table]: { ...editsRef.current[table], [row]: { ...editsRef.current[table]?.[row], [column]: value } } };
    editsRef.current = next;
    setEdits(next);
    rebuild();
  };
  const clearEdits = () => {
    editsRef.current = {};
    setEdits({});
    rebuild();
  };
  /** Builds the data again with the current edits; the open tab and page stay where they are. */
  const rebuild = () =>
    start(async () => {
      const r = await generate(input(settings.format));
      setResult(r);
    });

  const toggleAuto = (v: boolean) => {
    setAuto(v);
    try { localStorage.setItem(AUTO_KEY, v ? "1" : "0"); } catch { /* storage can be blocked */ }
  };
  const shuffleSeed = () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    if (auto && hasResult.current) set({ seed });
    else run({ seed });
  };

  // ⌘/Ctrl + Enter builds the data from anywhere on the page.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportAs = async (format: ExportFormat, dialect?: SqlDialect) => {
    setExporting(true);
    try {
      const r = await generate(input(format, true, dialect));
      if (!r.ok) return setResult(r);
      r.files.forEach(downloadFile);
      addHistory({
        kind: "export", now: r.now, settings: { ...settings, format, dialect: dialect ?? settings.dialect }, schema, tables: r.tables.length,
        rows: r.tables.reduce((n, x) => n + x.rows, 0), files: r.files.map((f) => f.name),
      });
    } finally {
      setExporting(false);
    }
  };

  const pickFolder = async (files: FileList | null) => {
    if (!files?.length) return;
    setImportError(null);
    const r = await importFiles(await readFolder(files));
    if (!r.ok) return setImportError(r.error);
    setSchema(r.source);
    set({ from: r.format, tableRows: {} });
    setImported({ count: r.used.length, format: r.format, skipped: r.skipped, files: r.files });
    if (folder.current) folder.current.value = "";
  };

  const share = async () => {
    const url = location.origin + location.pathname + shareHash({
      schema, from: settings.from, locale: settings.locale, rows: settings.rows, seed: settings.seed, format: settings.format,
    });
    let state: "ok" | "long" = "ok";
    if (url.length > MAX_LINK) state = "long";
    else {
      try { await navigator.clipboard.writeText(url); } catch { state = "long"; }
    }
    setShared(state);
    setTimeout(() => setShared(null), 2500);
  };

  const copy = async (name: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard can be blocked */
    }
  };

  const ok = result?.ok ? result : null;
  const editCount = Object.values(edits).reduce((n, rows) => n + Object.values(rows).reduce((m, cols) => m + Object.keys(cols).length, 0), 0);
  const totals = ok && {
    tables: ok.tables.length,
    fields: ok.tables.reduce((n, x) => n + x.fields, 0),
    rows: ok.tables.reduce((n, x) => n + x.rows, 0),
  };
  const activeTab = ok && (tab === "output" || ok.preview.some((p) => `t:${p.name}` === tab)) ? tab : "output";

  const left = (
    <div className="space-y-8 p-4 md:p-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{t("inputTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("inputHint")}</p>
          </div>
          <div className="flex gap-2">
            <IconButton variant="outline" label={t("importFolder")} onClick={() => folder.current?.click()}><FolderOpen /></IconButton>
            <SampleMenu onPick={(sample) => { setSchema(sample.schema); setImported(null); set({ tableRows: {}, from: "auto" }); }}>
              <IconButton variant="outline" label={t("loadSample")}><FlaskConical /></IconButton>
            </SampleMenu>
          </div>
          <input ref={folder} type="file" multiple hidden onChange={(e) => pickFolder(e.target.files)}
            {...folderInputProps} />
        </div>
        {imported && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("imported", { count: imported.count, format: imported.format, skipped: imported.skipped })}</p>
            <FileTree files={imported.files} />
          </div>
        )}
        {importError && <p role="alert" className="text-sm text-destructive">{errorText(importError)}</p>}
        <DropZone onFiles={pickFolder}>
          <Textarea value={schema} onChange={(e) => { setSchema(e.target.value); setImported(null); }} spellCheck={false}
            aria-label={t("inputTitle")} aria-invalid={!!schemaError} className="max-h-96 min-h-64 bg-card font-mono text-[13px] leading-relaxed" />
        </DropZone>
        {schemaError && schema.trim() && <p role="alert" className="text-sm text-destructive">{errorText(schemaError)}</p>}
      </section>

      {info && info.tables.length > 0 && (
        <section className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("tablesTitle")} <span className="font-normal text-muted-foreground">({info.tables.length})</span></h2>
              {Object.keys(settings.tableRows).length > 0 && (
                <Button variant="outline" size="sm" onClick={() => set({ tableRows: {} })}>{t("applyAll", { rows: settings.rows })}</Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("tablesHint")}</p>
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto border-y">
            {info.tables.map((x) => (
              <li key={x.name} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{x.name}</p>
                  <p className="text-xs text-muted-foreground">{t("fieldsCount", { count: x.fields.length })}</p>
                </div>
                <Input type="number" min={0} max={1000} aria-label={`${x.name} ${t("rows")}`} className="h-8 w-24 bg-card"
                  value={settings.tableRows[x.name] ?? settings.rows}
                  onChange={(e) => set({ tableRows: { ...settings.tableRows, [x.name]: Number(e.target.value) } })} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label={t("inputFormat")}>
          <Select value={settings.from} onValueChange={(v) => set({ from: v as StudioSettings["from"] })}>
            <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("auto")}</SelectItem>
              {INPUTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("outputFormat")}>
          <Select value={settings.format} onValueChange={(v) => set({ format: v as ExportFormat })}>
            <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{EXPORT_FORMATS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={t("locale")}>
          <Select value={settings.locale} onValueChange={(v) => set({ locale: v, region: regions[v] ?? settings.region })}>
            <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{locales.map((l) => <SelectItem key={l.code} value={l.code}>{l.label} · {l.code}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("rows")}>
            <Input type="number" min={1} max={1000} value={settings.rows} className="bg-card" onChange={(e) => set({ rows: Number(e.target.value) })} />
          </Field>
          <Field label={t("seed")}>
            <Input type="number" value={settings.seed} className="bg-card" onChange={(e) => set({ seed: Number(e.target.value) })} />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground sm:col-span-2">{t("seedHint")}</p>

        {settings.format === "sql" && (
          <div className="grid gap-x-4 gap-y-3 sm:col-span-2 sm:grid-cols-2">
            <Field label={t("sqlDialect")}>
              <Select value={settings.dialect} onValueChange={(v) => set({ dialect: v as SqlDialect })}>
                <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIALECT_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <ToggleRow id="ddl" label={t("includeDdl")} hint={t("includeDdlHint")} checked={settings.ddl} onChange={(v) => set({ ddl: v })} />
          </div>
        )}

        <details className="group space-y-4 border-t pt-4 sm:col-span-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            {t("advanced")}
            <span className="font-normal text-muted-foreground">· {t("advancedHint")}</span>
          </summary>
          <div className="space-y-4 pt-4">
          <ToggleRow id="regional" label={t("regional")} hint={t("regionalHint")} checked={settings.regional} onChange={(v) => set({ regional: v })} />
          {settings.regional && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t("dateFormat")}>
                  <Select value={settings.region.date} onValueChange={(v) => set({ region: { ...settings.region, date: v } })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{DATE_PATTERNS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={t("decimalSep")}>
                  <Select value={settings.region.decimal} onValueChange={(v) => set({ region: { ...settings.region, decimal: v } })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{DECIMALS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={t("thousandsSep")}>
                  <Select value={settings.region.thousands || "none"} onValueChange={(v) => set({ region: { ...settings.region, thousands: v === "none" ? "" : v } })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {THOUSANDS.map((d) => <SelectItem key={d || "none"} value={d || "none"}>{d === " " ? t("sepSpace") : d === "" ? t("sepNone") : d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">{t("regionExample")}: <span className="font-mono text-foreground">{regionExample(settings.region)}</span></p>
            </>
          )}
          <ToggleRow id="edge" label={t("edgeCases")} hint={t("edgeCasesHint")} checked={settings.edgeCases} onChange={(v) => set({ edgeCases: v })} className="border-t pt-4" />
          </div>
        </details>
      </section>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
        <Button onClick={() => run()} disabled={busy} className="flex-1">
          <Sparkles />
          {busy ? t("generating") : ok ? t("regenerate") : t("generate")}
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1.5 text-[11px] font-normal opacity-80 sm:inline">⌘↵</kbd>
        </Button>
        <div className="flex items-center gap-2">
          <Switch id="auto" checked={auto} onCheckedChange={toggleAuto} />
          <Label htmlFor="auto" className="cursor-pointer text-sm" title={t("autoRunHint")}>{t("autoRun")}</Label>
        </div>
      </div>
    </div>
  );

  const right = (
    <div className="flex h-full min-h-[24rem] min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 md:px-6">
        <div>
          <h2 className="font-semibold">{t("outputTitle")}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {totals ? `${totals.tables} ${t("stats.tables").toLowerCase()} · ${totals.fields} ${t("stats.fields").toLowerCase()} · ${totals.rows} ${t("stats.rows").toLowerCase()}` : t("builtFrom")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ok && <Badge variant="secondary">{t("detected", { format: ok.detected })}</Badge>}
          <ExportMenu busy={exporting} onExport={exportAs} />
        </div>
      </div>

      {result && !result.ok && <p role="alert" className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:mx-6">{errorText(result.error)}</p>}
      {!result && <p className="m-4 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground md:mx-6">{t("empty")}</p>}
      {ok && (
        <Tabs value={activeTab} onValueChange={setTab} className={`min-h-0 min-w-0 flex-1 gap-0 transition-opacity ${busy ? "opacity-50" : ""}`}>
          <div className="overflow-x-auto border-b px-4 py-2 md:px-6">
            <TabsList className="h-auto justify-start">
              <TabsTrigger value="output">{settings.format}</TabsTrigger>
              {ok.preview.map((p) => <TabsTrigger key={p.name} value={`t:${p.name}`}>{p.name}</TabsTrigger>)}
            </TabsList>
          </div>

          <TabsContent value="output" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
            {ok.files.map((f) => <FileView key={f.name} file={f} copied={copied === f.name} onCopy={() => copy(f.name, f.content)} t={t} />)}
          </TabsContent>

          {ok.preview.map((p) => (
            <TabsContent key={p.name} value={`t:${p.name}`} className="min-h-0 flex-1 flex-col data-[state=active]:flex">
              <DataGrid key={p.name} table={p} edits={edits[p.name] as TableEdits | undefined}
                onEdit={(row, column, text, current) => editCell(p.name, row, column, text, current)} lookup={(table, column, value) => {
                  const parent = ok.preview.find((x) => x.name === table);
                  const col = parent ? parent.columns.indexOf(column) : -1;
                  const row = parent?.rows.find((r) => String(r[col]) === String(value));
                  return parent && row ? { columns: parent.columns, row } : null;
                }} focus={focus?.table === p.name ? focus : null}
                onFollow={(table, column, value) => { setFocus({ table, column, value: value as NonNullable<StudioView["focus"]>["value"] }); setTab(`t:${table}`); }} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {ok && totals && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-xs tabular-nums text-muted-foreground md:px-6" aria-live="polite">
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${busy ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
            {busy ? t("updating") : t("upToDate")}
          </span>
          {editCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              {t("editedCells", { count: editCount })}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearEdits}>{t("undoEdits")}</Button>
            </span>
          )}
          <span>{totals.tables} {t("stats.tables").toLowerCase()} · {totals.rows} {t("stats.rows").toLowerCase()}{took ? ` · ${took.ms}ms` : ""}</span>
          <span className="ml-auto flex items-center gap-1">
            seed {settings.seed}
            <IconButton variant="ghost" label={t("shuffleSeed")} onClick={shuffleSeed} disabled={busy}><Dices /></IconButton>
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        icon={<WandSparkles />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
          <IconButton variant="outline" label={shared === "ok" ? t("linkCopied") : shared === "long" ? t("linkTooLong") : t("share")} onClick={share}>
            {shared === "ok" ? <Check /> : <Link2 />}
          </IconButton>
          <Button onClick={() => run()} disabled={busy} title="⌘/Ctrl + Enter" className="max-sm:hidden">
            <Sparkles />
            {busy ? t("generating") : ok ? t("regenerate") : t("generate")}
          </Button>
          </>
        }
      />
      <SplitView id="studio" left={left} right={right} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function ToggleRow({ id, label, hint, checked, onChange, className }: {
  id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className ?? ""}`}>
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FileView({ file, copied, onCopy, t }: { file: OutputFile; copied: boolean; onCopy: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm">{file.name}</p>
        <div className="flex gap-2">
          {!file.binary && (
            <IconButton variant="outline" label={copied ? t("copied") : t("copy")} onClick={onCopy}>{copied ? <Check /> : <Copy />}</IconButton>
          )}
          <IconButton variant="outline" label={t("download")} onClick={() => downloadFile(file)}><Download /></IconButton>
        </div>
      </div>
      {file.binary ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("binaryNote")}</p>
      ) : (
        <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-card p-4 font-mono text-[12.5px] leading-relaxed"><code>{file.content}</code></pre>
      )}
    </div>
  );
}
