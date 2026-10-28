"use client";

import { Check, Copy, Download, FolderOpen, Maximize, Network, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { analyze, importFiles, type AnalyzeResult, type ImportedFile } from "@/app/actions";
import { ErDiagram } from "@/components/er-diagram";
import { FileTree } from "@/components/file-tree";
import { PageHeader } from "@/components/page-header";
import { SplitView } from "@/components/split-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { folderInputProps, readFolder } from "@/lib/folder";
import { colorOf, layoutEr, toMermaid } from "@/lib/er-layout";
import { loadSchema, saveSchema } from "@/lib/schema-store";
import { SAMPLE_SCHEMA } from "@/lib/sample";

export function DiagramView() {
  const t = useTranslations("diagramPage");
  const ts = useTranslations("studio");
  const folder = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<{ text: string; files: ImportedFile[] } | null>(null);
  const [zoom, setZoom] = useState(1);
  const view = useRef<HTMLDivElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [result, setResult] = useState<AnalyzeResult | { ok: false; error: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const svg = useRef<SVGSVGElement>(null);
  const ready = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = loadSchema();
    if (saved) setSchema(saved);
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    saveSchema(schema);
  }, [schema]);

  // Re-read the schema shortly after typing stops.
  useEffect(() => {
    const id = setTimeout(() => start(async () => setResult(await analyze({ schema, from: "auto" }))), 350);
    return () => clearTimeout(id);
  }, [schema]);

  const ok = result?.ok ? result : null;
  const visible = useMemo(() => (ok ? ok.tables.filter((x) => !hidden.has(x.name)) : []), [ok, hidden]);
  const layout = useMemo(() => (visible.length ? layoutEr(visible) : null), [visible]);
  const links = layout?.edges.length ?? 0;

  const needle = query.trim().toLowerCase();
  const matchesText = (x: { name: string; fields: { name: string }[] }) =>
    x.name.toLowerCase().includes(needle) || x.fields.some((f) => f.name.toLowerCase().includes(needle));
  const matches = useMemo(
    () => new Set(needle ? visible.filter(matchesText).map((x) => x.name) : []),
    [visible, needle], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const listed = ok ? (needle ? ok.tables.filter(matchesText) : ok.tables) : [];
  const related = selected && layout ? new Set(layout.edges.flatMap((e) => (e.from === selected ? [e.to] : e.to === selected ? [e.from] : []))).size : 0;

  const focusTable = (name: string) => {
    if (hidden.has(name)) setHidden((h) => new Set([...h].filter((n) => n !== name)));
    setSelected(name);
    const b = layout?.boxes.find((x) => x.table.name === name);
    if (b) view.current?.scrollTo({ left: Math.max(0, b.x * zoom - 40), top: Math.max(0, b.y * zoom - 40), behavior: "smooth" });
  };
  const toggle = (name: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  const fit = () => {
    if (!layout) return;
    const w = view.current?.clientWidth ?? 900;
    setZoom(Math.min(1, Math.max(0.3, (w - 8) / layout.width)));
  };
  // Fit the whole diagram into view whenever the set of tables changes.
  const shape = layout ? `${layout.boxes.length}:${layout.width}` : "";
  useEffect(() => { if (selected && hidden.has(selected)) setSelected(null); }, [hidden, selected]);
  useEffect(fit, [shape]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFolder = async (files: FileList | null) => {
    if (!files?.length) return;
    setImportError(null);
    const r = await importFiles(await readFolder(files));
    if (folder.current) folder.current.value = "";
    if (!r.ok) return setImportError(r.error);
    setSchema(r.source);
    setImported({ text: ts("imported", { count: r.used.length, format: r.format, skipped: r.skipped }), files: r.files });
  };

  const downloadSvg = () => {
    if (!svg.current) return;
    const copy = svg.current.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("width", String(layout?.width ?? 0));
    copy.setAttribute("height", String(layout?.height ?? 0));
    const xml = new XMLSerializer().serializeToString(copy).replace(/var\(--card\)/g, "#ffffff").replace(/var\(--muted\)/g, "#f1f1f3").replace(/currentColor/g, "#18181b");
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "diagram.svg" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMermaid = async () => {
    if (!ok) return;
    try {
      await navigator.clipboard.writeText(toMermaid(visible));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked */
    }
  };

  const left = (
        <section className="space-y-3 p-4 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t("inputTitle")}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => folder.current?.click()}><FolderOpen />{ts("importFolder")}</Button>
              <Button variant="outline" size="sm" onClick={() => { setSchema(SAMPLE_SCHEMA); setImported(null); }}>{t("loadSample")}</Button>
            </div>
            <input ref={folder} type="file" multiple hidden onChange={(e) => pickFolder(e.target.files)} {...folderInputProps} />
          </div>
          {imported && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{imported.text}</p>
              <FileTree files={imported.files} />
            </div>
          )}
          {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
          <Textarea value={schema} onChange={(e) => { setSchema(e.target.value); setImported(null); }} spellCheck={false} aria-label={t("inputTitle")}
            className="max-h-72 min-h-40 bg-card font-mono text-[13px] leading-relaxed" />

          {ok && ok.tables.length > 0 && (
            <div className="space-y-2 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t("tablesTitle")} <span className="font-normal text-muted-foreground tabular-nums">({visible.length}/{ok.tables.length})</span></h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setHidden(new Set())}>{t("showAll")}</Button>
                  <Button variant="outline" size="sm" onClick={() => setHidden(new Set(ok.tables.map((x) => x.name)))}>{t("hideAll")}</Button>
                </div>
              </div>
              <ul className="max-h-[26rem] divide-y overflow-y-auto border-y">
                {listed.map((x) => (
                  <li key={x.name} className={`flex items-center gap-2.5 px-1 py-1.5 ${selected === x.name ? "bg-muted" : ""}`}>
                    <input type="checkbox" checked={!hidden.has(x.name)} onChange={() => toggle(x.name)} aria-label={x.name} className="size-4 shrink-0 accent-[var(--brand)]" />
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(x.name) }} />
                    <button type="button" onClick={() => focusTable(x.name)} className={`min-w-0 flex-1 truncate text-left text-sm ${hidden.has(x.name) ? "text-muted-foreground line-through" : ""}`}>{x.name}</button>
                    <span className="text-xs tabular-nums text-muted-foreground">{x.fields.length}</span>
                  </li>
                ))}
                {listed.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">{t("noMatch")}</li>}
              </ul>
            </div>
          )}
        </section>
  );
  const right = (
        <section className="flex h-full min-h-[24rem] min-w-0 flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground tabular-nums">
              {ok ? t("summary", { tables: visible.length, links }) : t("hint")}
            </p>
            {ok && (
              <div className="relative min-w-40 max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} placeholder={t("search")} aria-label={t("search")} className="bg-card pl-9"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { const first = visible.find(matchesText); if (first) focusTable(first.name); }
                    if (e.key === "Escape") { setQuery(""); setSelected(null); }
                  }} />
              </div>
            )}
            <div className="flex items-center gap-1">
              {ok && layout && (
                <>
                  <Button variant="outline" size="icon" aria-label="zoom out" onClick={() => setZoom((z) => Math.max(0.15, +(z - 0.15).toFixed(2)))}><ZoomOut /></Button>
                  <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" aria-label="zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}><ZoomIn /></Button>
                  <Button variant="outline" size="icon" aria-label="fit" onClick={fit}><Maximize /></Button>
                </>
              )}
              {ok && <Badge variant="secondary" className="ml-2">{ok.detected}</Badge>}
            </div>
          </div>
          {selected && (
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(selected) }} />
                <b className="truncate">{selected}</b>
                <span className="text-muted-foreground">{t("selected", { count: related })}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><X />{t("clear")}</Button>
            </div>
          )}
          {result && !result.ok && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{result.error}</p>}
          {ok && ok.tables.length === 0 && <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">{t("empty")}</p>}
          {ok && ok.tables.length > 0 && !layout && <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">{t("allHidden")}</p>}
          {ok && layout && ok.tables.length > 0 && (
            <>
              <div ref={view} className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card">
                <ErDiagram ref={svg} tables={visible} layout={layout} scale={zoom} selected={selected} matches={matches} onSelect={setSelected}
                  labels={{ entity: t("legend.entity"), root: t("legend.root"), join: t("legend.join") }} />
              </div>
              <ul className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="size-3 rounded-[3px] border" style={{ borderColor: "hsl(14 75% 52%)", background: "hsl(14 80% 55% / 0.15)" }} />{t("legend.root")}</li>
                <li className="flex items-center gap-2"><span className="size-3 rounded-[3px] border border-foreground" />{t("legend.entity")}</li>
                <li className="flex items-center gap-2"><span className="size-3 rounded-[3px] border border-dashed border-foreground" />{t("legend.join")}</li>
                <li><span className="font-mono">#</span> {t("legend.pk")}</li>
                <li><span className="font-mono">→</span> {t("legend.fk")}</li>
                <li><span className="font-mono">1 / N</span> {t("legend.cardinality")}</li>
                <li className="text-muted-foreground">{t("legend.hint")}</li>
              </ul>
            </>
          )}
        </section>
  );

  return (
    <>
      <PageHeader
        icon={<Network />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={copyMermaid} disabled={!ok}>
              {copied ? <Check /> : <Copy />}{copied ? t("copied") : t("copyMermaid")}
            </Button>
            <Button onClick={downloadSvg} disabled={!ok}><Download />{t("downloadSvg")}</Button>
          </>
        }
      />
      <SplitView id="diagram" defaultLeft={30} left={left} right={right} />
    </>
  );
}
