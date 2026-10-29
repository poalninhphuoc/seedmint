"use client";

import { ChevronDown, ChevronRight, Database, Download, History, Pencil, RotateCcw, Table2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { generate } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useErrorText } from "@/hooks/use-error-text";
import { IconButton } from "@/components/icon-button";
import { useRouter } from "@/i18n/navigation";
import { saveDataset } from "@/lib/dataset";
import { downloadFile } from "@/lib/download";
import { clearProjects, loadProjects, removeProject, removeVersion, renameProject, setCurrentProject, type Project, type Version } from "@/lib/history";
import { saveSchema, saveSettings } from "@/lib/studio-state";

export function HistoryView() {
  const t = useTranslations("historyPage");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => setProjects(loadProjects());
  useEffect(() => {
    const list = loadProjects();
    setProjects(list);
    if (list[0]) setOpenIds(new Set([list[0].id]));
  }, []);

  const toggle = (id: string) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Coming back to a version: its schema and settings go where Studio and the data admin read them.
  const restore = (p: Project, v: Version, to: "/" | "/data") => {
    // The project opens first: the version's schema and settings are written into that project's own state.
    setCurrentProject(p.id);
    if (v.schema) saveSchema(v.schema);
    saveSettings(v.settings);
    if (to === "/data") saveDataset(v.data);
    router.push(to);
  };

  const again = async (v: Version) => {
    if (!v.schema) return;
    setBusy(v.id);
    setError(null);
    try {
      const r = await generate({ schema: v.schema, ...v.settings, bundle: true, now: v.now });
      if (!r.ok) setError(r.error);
      else r.files.forEach(downloadFile);
    } finally {
      setBusy(null);
    }
  };

  const commitRename = () => {
    if (renaming) renameProject(renaming.id, renaming.name);
    setRenaming(null);
    refresh();
  };

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader
        icon={<History />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          projects?.length ? (
            <IconButton variant="outline" size="icon" label={t("clearAll")} onClick={() => { clearProjects(); setProjects([]); }}><Trash2 /></IconButton>
          ) : null
        }
      />
      {error && <p role="alert" className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:mx-6">{errorText(error)}</p>}
      {projects && projects.length === 0 && <p className="p-12 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      {projects && projects.length > 0 && (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 md:p-6">
          {projects.map((p) => {
            const open = openIds.has(p.id);
            const latest = p.versions[0];
            return (
              <section key={p.id} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => toggle(p.id)} aria-expanded={open} aria-label={p.name} className="text-muted-foreground">
                    {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  <Database className="size-4 text-muted-foreground" />
                  {renaming?.id === p.id ? (
                    <Input autoFocus value={renaming.name} aria-label={t("rename")} className="h-8 max-w-xs"
                      onChange={(e) => setRenaming({ id: p.id, name: e.target.value })} onBlur={commitRename}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }} />
                  ) : (
                    <button type="button" onClick={() => toggle(p.id)} className="min-w-0 truncate font-semibold">{p.name}</button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t("tablesCount", { count: latest?.tables ?? p.tableNames.length })} · {t("versions", { count: p.versions.length })} · {fmt.format(new Date(p.updatedAt))}
                  </span>
                  <span className="ml-auto flex items-center">
                    <IconButton variant="ghost" label={t("rename")} onClick={() => setRenaming({ id: p.id, name: p.name })}><Pencil /></IconButton>
                    <IconButton variant="ghost" label={t("open")} disabled={!latest?.schema} onClick={() => latest && restore(p, latest, "/")}><RotateCcw /></IconButton>
                    <IconButton variant="ghost" label={t("openData")} disabled={!latest?.data} onClick={() => latest && restore(p, latest, "/data")}><Table2 /></IconButton>
                    <IconButton variant="ghost" label={t("deleteProject")} onClick={() => { removeProject(p.id); refresh(); }}><Trash2 /></IconButton>
                  </span>
                </div>
                {open && (
                  <div className="overflow-x-auto border-t">
                    <table className="w-full min-w-[52rem] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          {["version", "when", "action", "format", "locale", "tables", "rows"].map((k) => (
                            <th key={k} className="px-4 py-2.5 font-medium">{t(`cols.${k}`)}</th>
                          ))}
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {p.versions.map((v, i) => (
                          <tr key={v.id}>
                            <td className="px-4 py-2.5 font-mono">v{p.versions.length - i}</td>
                            <td className="whitespace-nowrap px-4 py-2.5">{fmt.format(new Date(v.at))}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant={v.kind === "export" ? "default" : "secondary"}>{t(`kind.${v.kind}`)}</Badge>
                              {v.data && <Badge variant="outline" className="ml-1.5">{t("withData")}</Badge>}
                            </td>
                            <td className="px-4 py-2.5 font-mono">{v.settings.format}{v.settings.format === "sql" ? ` · ${v.settings.dialect}` : ""}</td>
                            <td className="px-4 py-2.5 font-mono">{v.settings.locale}</td>
                            <td className="px-4 py-2.5 tabular-nums">{v.tables}</td>
                            <td className="px-4 py-2.5 tabular-nums">{v.rows}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right">
                              <IconButton variant="ghost" label={t("open")} disabled={!v.schema} onClick={() => restore(p, v, "/")}><RotateCcw /></IconButton>
                              <IconButton variant="ghost" label={t("openData")} disabled={!v.data} onClick={() => restore(p, v, "/data")}><Table2 /></IconButton>
                              <IconButton variant="ghost" label={t("exportAgain")} disabled={!v.schema || busy === v.id} onClick={() => again(v)}><Download /></IconButton>
                              <IconButton variant="ghost" label={t("delete")} onClick={() => { removeVersion(p.id, v.id); refresh(); }}><Trash2 /></IconButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
