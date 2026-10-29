"use client";

import { Check, ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, FilePlus2, FileUp, FlaskConical, FolderOpen, ImageDown, Maximize, Network, RotateCcw, Save, Search, TableProperties, WandSparkles, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useUrlState } from "@/lib/url-state";
import { analyze, generate, importFiles, type AnalyzeResult, type ImportedFile, type PreviewTable } from "@/app/actions";
import { DataGrid } from "@/components/data-grid";
import { DropZone } from "@/components/drop-zone";
import { ErDiagram } from "@/components/er-diagram";
import { FileTree } from "@/components/file-tree";
import { PageHeader } from "@/components/page-header";
import { SplitView } from "@/components/split-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { fullSettings, saveView } from "@/lib/studio-state";
import { addVersion } from "@/lib/history";
import { useErrorText } from "@/hooks/use-error-text";
import { IconButton } from "@/components/icon-button";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { folderInputProps, readFolder } from "@/lib/folder";
import { colorOf, layoutEr, settleMoved, toMermaid, withOffsets } from "@/lib/er-layout";
import { loadSchema, saveSchema } from "@/lib/schema-store";
import { SampleMenu } from "@/components/sample-menu";
import { SAMPLE_SCHEMA } from "@/lib/sample";

export function DiagramView() {
  const t = useTranslations("diagramPage");
  const ts = useTranslations("studio");
  const errorText = useErrorText();
  const router = useRouter();
  const [showSchema, setShowSchema] = useState(true);
  const folder = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<{ text: string; files: ImportedFile[] } | null>(null);
  const [zoom, setZoom] = useState(1);
  const view = useRef<HTMLDivElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [result, setResult] = useState<AnalyzeResult | { ok: false; error: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [, start] = useTransition();
  const svg = useRef<SVGSVGElement>(null);
  // Flips once the saved schema is in state; saving before that would overwrite it with the sample.
  const [loaded, setLoaded] = useState(false);
  const url = useUrlState();
  // The selected table and the search text live in the URL: reload or Back comes back to the same view.
  const selected = url.params.get("table");
  const setSelected = (n: string | null) => url.set({ table: n });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const query = url.params.get("q") ?? "";
  const setQuery = (q: string) => url.set({ q }, "replace");
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [data, setData] = useState<PreviewTable[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [port, setPort] = useState({ left: 0, top: 0, w: 0, h: 0 });

  useEffect(() => {
    const saved = loadSchema();
    if (saved) setSchema(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveSchema(schema);
  }, [schema, loaded]);

  // Re-read the schema shortly after typing stops.
  useEffect(() => {
    const id = setTimeout(() => start(async () => setResult(schema.trim() ? await analyze({ schema, from: "auto" }) : null)), 350);
    return () => clearTimeout(id);
  }, [schema]);

  useEffect(() => setMoved({}), [schema]);

  // Sample rows for the table whose icon was clicked; rebuilt shortly after the schema changes.
  useEffect(() => {
    if (!preview) return;
    let stale = false;
    const id = setTimeout(async () => {
      const r = await generate({
        schema, from: "auto", locale: "en", rows: 25, seed: 42, format: "json", edgeCases: false, dialect: "postgres", ddl: false,
        regional: false, region: { date: "yyyy-MM-dd", decimal: ".", thousands: "," },
      });
      if (stale) return;
      setDataError(r.ok ? null : r.error);
      setData(r.ok ? r.preview : null);
    }, 350);
    return () => { stale = true; clearTimeout(id); };
  }, [preview, schema]);
  const shown = preview && data ? data.find((x) => x.name === preview) ?? null : null;

  const ok = result?.ok ? result : null;
  const visible = useMemo(() => (ok ? ok.tables.filter((x) => !hidden.has(x.name)) : []), [ok, hidden]);
  const [moved, setMoved] = useState<Readonly<Record<string, { x: number; y: number }>>>({});
  const auto = useMemo(() => (visible.length ? layoutEr(visible) : null), [visible]);
  const layout = useMemo(() => (auto ? withOffsets(auto, moved) : null), [auto, moved]);
  // Hiding or showing a table, or editing the schema, shifts the automatic layout under the tables placed by hand: move them clear of their neighbours.
  useEffect(() => {
    if (!auto) return;
    setMoved((m) => {
      if (!Object.keys(m).length) return m;
      const next = settleMoved(auto, m);
      return Object.keys(m).every((n) => !next[n] || (next[n].x === m[n].x && next[n].y === m[n].y)) ? m : { ...m, ...next };
    });
  }, [auto]);
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

  // Ctrl/⌘ + wheel (also trackpad pinch) zooms around the cursor; a plain wheel scrolls the canvas both ways.
  const zoomRef = useRef(zoom);
  const anchor = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  zoomRef.current = zoom;
  const suppress = useRef(false);
  const hasCanvas = !!layout;
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z1 = zoomRef.current;
      const z2 = Math.min(2, Math.max(0.15, +(z1 * Math.exp(-e.deltaY * 0.0025)).toFixed(3)));
      if (z2 === z1) return;
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      anchor.current = { x: cx, y: cy, px: (el.scrollLeft + cx) / z1, py: (el.scrollTop + cy) / z1 };
      setZoom(z2);
    };
    // Hold the mouse on empty canvas and drag to pan; a short click still selects a table.
    let drag: { id: number; x: number; y: number; left: number; top: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("[data-table]")) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
      el.scrollLeft = drag.left - dx;
      el.scrollTop = drag.top - dy;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        el.releasePointerCapture(e.pointerId);
        el.style.cursor = "";
      }
      drag = null;
    };
    // The click that ends a drag must not select or clear a table.
    const onClick = (e: MouseEvent) => {
      if (suppress.current) { e.stopPropagation(); e.preventDefault(); suppress.current = false; }
    };
    const markMoved = () => { suppress.current = !!drag?.moved; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", markMoved, true);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", markMoved, true);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [hasCanvas]);
  // Shortcuts: F fits the diagram, 0 resets to 100%, + and - zoom. Ignored while typing.
  const keys = useRef<(k: string) => void>(() => {});
  keys.current = (k) => {
    if (k === "f") fit();
    else if (k === "0") setZoom(1);
    else if (k === "+" || k === "=") setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)));
    else if (k === "-") setZoom((z) => Math.max(0.15, +(z - 0.15).toFixed(2)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      keys.current(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a || !view.current) return;
    anchor.current = null;
    view.current.scrollLeft = a.px * zoom - a.x;
    view.current.scrollTop = a.py * zoom - a.y;
  }, [zoom]);

  // Track what part of the canvas is on screen, for the minimap.
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    let raf = 0;
    const read = () => { raf = 0; setPort({ left: el.scrollLeft, top: el.scrollTop, w: el.clientWidth, h: el.clientHeight }); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    el.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [hasCanvas, zoom]);

  const fit = () => {
    if (!layout) return;
    const w = view.current?.clientWidth ?? 900;
    setZoom(Math.min(1, Math.max(0.3, (w - 8) / layout.width)));
  };
  // Fit the whole diagram into view whenever the set of tables changes.
  const shape = auto ? `${auto.boxes.length}:${auto.width}` : "";
  useEffect(() => { if (selected && hidden.has(selected)) url.set({ table: null }, "replace"); }, [hidden, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(fit, [shape]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFolder = async (files: FileList | null) => {
    if (!files?.length) return;
    setImportError(null);
    const r = await importFiles(await readFolder(files));
    if (folder.current) folder.current.value = "";
    if (fileInput.current) fileInput.current.value = "";
    if (!r.ok) return setImportError(r.error);
    setSchema(r.source);
    setImported({ text: ts("imported", { count: r.used.length, format: r.format, skipped: r.skipped }), files: r.files });
  };

  const lightSvg = () => {
    if (!svg.current) return null;
    const copy = svg.current.cloneNode(true) as SVGSVGElement;
    copy.querySelectorAll("[data-no-drag]").forEach((n) => n.remove());
    copy.setAttribute("width", String(layout?.width ?? 0));
    copy.setAttribute("height", String(layout?.height ?? 0));
    return new XMLSerializer().serializeToString(copy).replace(/var\(--card\)/g, "#ffffff").replace(/var\(--muted\)/g, "#f1f1f3").replace(/currentColor/g, "#18181b");
  };

  /** Files the current schema under its project in the history (Lịch sử). */
  const saveProject = () => {
    if (!ok?.tables.length) return;
    addVersion({
      kind: "save", now: new Date().toISOString(), settings: fullSettings(), schema, tables: ok.tables.map((x) => x.name),
      rows: 0, files: [], data: null,
    });
    setSavedAt(true);
    setTimeout(() => setSavedAt(false), 2000);
  };

  /** Empties the schema box and the diagram, to start a new project. Saved projects stay in the history. */
  const newProject = () => {
    if (schema.trim() && !confirm(ts("newProjectConfirm"))) return;
    setSchema("");
    setImported(null);
    setImportError(null);
    setResult(null);
    setHidden(new Set());
    setMoved({});
    url.set({ table: null, q: null }, "replace");
  };

  // The schema is already stored for the Studio; ask it to build data and open on this table.
  const openInStudio = (table?: string) => {
    saveSchema(schema);
    saveView({ tab: table ? `t:${table}` : "output", focus: null, generated: true });
    router.push("/");
  };

  const save = (href: string, name: string) => {
    Object.assign(document.createElement("a"), { href, download: name }).click();
  };

  const downloadSvg = () => {
    const xml = lightSvg();
    if (!xml) return;
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    save(url, "diagram.svg");
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const xml = lightSvg();
    if (!xml || !layout) return;
    const scale = 2;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = layout.width * scale;
      canvas.height = layout.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        save(url, "diagram.png");
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
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
            <button type="button" onClick={() => setShowSchema((v) => !v)} aria-expanded={showSchema} className="flex items-center gap-1 font-semibold">
              {showSchema ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
              {t("inputTitle")}
            </button>
            <div className="flex gap-2">
              <IconButton variant="outline" label={ts("importFile")} onClick={() => fileInput.current?.click()}><FileUp /></IconButton>
              <IconButton variant="outline" label={ts("importFolder")} onClick={() => folder.current?.click()}><FolderOpen /></IconButton>
              <SampleMenu onPick={(sample) => { setSchema(sample.schema); setImported(null); }}>
                <IconButton variant="outline" label={t("loadSample")}><FlaskConical /></IconButton>
              </SampleMenu>
            </div>
            <input ref={fileInput} type="file" multiple hidden accept=".prisma,.sql,.ts,.tsx,.mts,.json,.dbml,.graphql,.gql,.yaml,.yml" onChange={(e) => pickFolder(e.target.files)} />
            <input ref={folder} type="file" multiple hidden onChange={(e) => pickFolder(e.target.files)} {...folderInputProps} />
          </div>
          {imported && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{imported.text}</p>
              <FileTree files={imported.files} />
            </div>
          )}
          {importError && <p role="alert" className="text-sm text-destructive">{errorText(importError)}</p>}
          {showSchema && (
            <DropZone onFiles={pickFolder}>
            <div className="relative h-24">
              <Textarea value={schema} onChange={(e) => { setSchema(e.target.value); setImported(null); }} spellCheck={false} aria-label={t("inputTitle")}
                onFocus={() => setEditing(true)} onBlur={() => setEditing(false)}
                className={cn("absolute inset-x-0 top-0 field-sizing-fixed min-h-0 resize-none bg-card font-mono text-[13px] leading-relaxed transition-[height,box-shadow] duration-200",
                  editing ? "z-20 h-[min(34rem,70vh)] shadow-xl" : "h-24 overflow-hidden")} />
            </div>
            </DropZone>
          )}

          {ok && ok.tables.length > 0 && (
            <div className="space-y-2 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t("tablesTitle")} <span className="font-normal text-muted-foreground tabular-nums">({visible.length}/{ok.tables.length})</span></h2>
                <div className="flex gap-2">
                  <IconButton variant="outline" label={t("showAll")} onClick={() => setHidden(new Set())}><Eye /></IconButton>
                  <IconButton variant="outline" label={t("hideAll")} onClick={() => setHidden(new Set(ok.tables.map((x) => x.name)))}><EyeOff /></IconButton>
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
  const canvas = (
    <section className="relative flex h-full min-h-[24rem] min-w-0 flex-col">
      {ok && layout && ok.tables.length > 0 ? (
        <div ref={view} className="min-h-0 flex-1 cursor-grab touch-pan-x touch-pan-y select-none overflow-auto bg-card pt-12 pb-10">
          <ErDiagram ref={svg} tables={visible} layout={layout} scale={zoom} selected={selected} matches={matches} onSelect={setSelected} onMove={(name, x, y) => setMoved((m) => ({ ...m, [name]: { x, y } }))} onMoveEnd={(name) => auto && setMoved((m) => settleMoved(auto, m, name))} onOpen={openInStudio}
            onPreview={(name) => setPreview((p) => (p === name ? null : name))} previewing={preview} needle={needle}
            labels={{ entity: t("legend.entity"), root: t("legend.root"), join: t("legend.join"), preview: t("previewData") }} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {result && !result.ok ? <p role="alert" className="text-destructive">{errorText(result.error)}</p>
            : ok && ok.tables.length === 0 ? t("empty")
            : ok ? t("allHidden")
            : t("hint")}
        </div>
      )}

      {ok && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-center gap-2">
          <span className="pointer-events-auto rounded-md border bg-card/90 px-2 py-1 text-xs tabular-nums text-muted-foreground shadow-sm backdrop-blur">
            {t("summary", { tables: visible.length, links })}
          </span>
          <div className="pointer-events-auto relative min-w-36 max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} placeholder={t("search")} aria-label={t("search")} className="h-8 bg-card/90 pl-8 text-sm shadow-sm backdrop-blur"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { const first = visible.find(matchesText); if (first) focusTable(first.name); }
                if (e.key === "Escape") { setQuery(""); setSelected(null); }
              }} />
          </div>
          <div className="pointer-events-auto ml-auto flex items-center gap-0.5 rounded-md border bg-card/90 p-0.5 shadow-sm backdrop-blur">
            {layout && (
              <>
                <IconButton variant="ghost" label={t("zoomOut")} onClick={() => setZoom((z) => Math.max(0.15, +(z - 0.15).toFixed(2)))}><ZoomOut /></IconButton>
                <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <IconButton variant="ghost" label={t("zoomIn")} onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}><ZoomIn /></IconButton>
                <IconButton variant="ghost" label={t("fit")} onClick={fit}><Maximize /></IconButton>
                {Object.keys(moved).length > 0 && <IconButton variant="ghost" label={t("resetLayout")} onClick={() => setMoved({})}><RotateCcw /></IconButton>}
              </>
            )}
            <Badge variant="secondary" className="mx-1">{ok.detected}</Badge>
          </div>
        </div>
      )}

      {layout && port.w > 0 && (layout.width * zoom > port.w + 4 || layout.height * zoom > port.h + 4) && (
        <Minimap layout={layout} zoom={zoom} port={port} label={t("minimap")}
          onGo={(x, y) => view.current?.scrollTo({ left: x * zoom - port.w / 2, top: y * zoom - port.h / 2 })} />
      )}

      {selected && (
        <div className="absolute bottom-2 right-2 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-md border bg-card/95 py-0.5 pl-3 pr-1 text-sm shadow-sm backdrop-blur">
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(selected) }} />
            <b className="truncate">{selected}</b>
            <span className="text-muted-foreground">{t("selected", { count: related })}</span>
          </span>
          <IconButton variant="ghost" label={t("clear")} onClick={() => setSelected(null)}><X /></IconButton>
        </div>
      )}

      {ok && layout && (
        <ul className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-3 gap-y-1 rounded-md border bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur" title={`${t("legend.hint")}. ${t("openHint")}. ${t("shortcuts")}`}>
          <li className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] border" style={{ borderColor: "hsl(14 75% 52%)", background: "hsl(14 80% 55% / 0.15)" }} />{t("legend.root")}</li>
          <li className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] border border-foreground" />{t("legend.entity")}</li>
          <li className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] border border-dashed border-foreground" />{t("legend.join")}</li>
          <li><span className="font-mono">#</span> {t("legend.pk")}</li>
          <li><span className="font-mono">→</span> {t("legend.fk")}</li>
          <li><span className="font-mono">1/N</span></li>
        </ul>
      )}
    </section>
  );

  // The data of one table slides up under the diagram; the divider between them can be dragged.
  const right = (
    <ResizablePanelGroup orientation="vertical" id="diagram-right" className="h-[70vh] lg:h-full">
      <ResizablePanel id="diagram-canvas" minSize="25%" className="overflow-hidden">{canvas}</ResizablePanel>
      {preview && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel id="diagram-data" defaultSize="40%" minSize="15%" maxSize="75%" className="overflow-hidden">
            <section className="flex h-full min-h-0 flex-col bg-background">
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-sm">
                <TableProperties className="size-4 text-muted-foreground" />
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(preview) }} />
                <b className="truncate">{preview}</b>
                <span className="text-muted-foreground">{t("sampleData")}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openInStudio(preview)}><WandSparkles />{t("openStudio")}</Button>
                  <IconButton variant="ghost" label={t("clear")} onClick={() => setPreview(null)}><X /></IconButton>
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {shown ? <DataGrid key={shown.name} table={shown} />
                  : dataError ? <p role="alert" className="text-sm text-destructive">{errorText(dataError)}</p>
                  : <p className="text-sm text-muted-foreground">…</p>}
              </div>
            </section>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );

  return (
    <>
      <PageHeader
        icon={<Network />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <IconButton variant="outline" label={savedAt ? ts("projectSaved") : ts("saveProject")} onClick={saveProject} disabled={!ok?.tables.length}>
              {savedAt ? <Check /> : <Save />}
            </IconButton>
            <IconButton variant="outline" label={ts("newProject")} onClick={newProject} disabled={!schema && !result}><FilePlus2 /></IconButton>
            <Button onClick={() => openInStudio()} disabled={!ok || ok.tables.length === 0}>
              <WandSparkles />{t("useForData")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!ok}><Download />{t("export")}<ChevronDown className="size-3.5 opacity-60" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={downloadPng}><ImageDown />{t("downloadPng")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadSvg}><Download />{t("downloadSvg")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={copyMermaid}>{copied ? <Check /> : <Copy />}{copied ? t("copied") : t("copyMermaid")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <SplitView id="diagram" defaultLeft={30} left={left} right={right} />
    </>
  );
}

const MAP_W = 150;

/** Whole diagram in miniature; the frame is what is on screen. Click or drag to move there. */
function Minimap({ layout, zoom, port, label, onGo }: {
  layout: NonNullable<ReturnType<typeof layoutEr>>; zoom: number; port: { left: number; top: number; w: number; h: number }; label: string; onGo: (x: number, y: number) => void;
}) {
  const k = MAP_W / layout.width;
  const h = Math.max(24, Math.min(110, layout.height * k));
  const go = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onGo(((e.clientX - r.left) / r.width) * layout.width, ((e.clientY - r.top) / r.height) * layout.height);
  };
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${layout.width} ${layout.height}`} width={MAP_W} height={h} preserveAspectRatio="xMinYMin meet"
      className="absolute right-2 top-16 cursor-pointer touch-none rounded-md border bg-card/90 shadow-sm backdrop-blur"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); go(e); }}
      onPointerMove={(e) => { if (e.buttons) go(e); }}>
      {layout.boxes.map((b, i) => <rect key={`${i}:${b.table.name}`} x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={colorOf(b.table.name)} opacity="0.7" />)}
      <rect x={port.left / zoom} y={port.top / zoom} width={port.w / zoom} height={port.h / zoom} fill="var(--brand)" fillOpacity="0.1" stroke="var(--brand)" strokeWidth={Math.max(2, 2 / k / 2)} />
    </svg>
  );
}
