"use client";

import { Database, FilePlus2, FlaskConical, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProjects, type Project } from "@/lib/history";
import { SAMPLES } from "@/lib/sample";

/** Where work starts: a blank project, one of the ready-made samples, or a project already saved. Each one gets its own id. */
export function ProjectGate({ onBlank, onSample, onOpen, onClose }: {
  onBlank: (name: string) => void;
  onSample: (sampleId: string) => void;
  onOpen: (id: string) => void;
  /** Present when a project is already open and the person may go back to it. */
  onClose?: () => void;
}) {
  const t = useTranslations("gate");
  const ts = useTranslations("samples");
  const locale = useLocale();
  const [name, setName] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => setProjects(loadProjects()), []);
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          {onClose && <Button variant="outline" onClick={onClose}><X />{t("close")}</Button>}
        </div>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="flex items-center gap-2 font-semibold"><FilePlus2 className="size-4" />{t("blankTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("blankHint")}</p>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); onBlank(name); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} aria-label={t("namePlaceholder")} className="max-w-sm" />
            <Button type="submit">{t("create")}</Button>
          </form>
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold"><FlaskConical className="size-4" />{t("samplesTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("samplesHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLES.map((s) => (
              <button key={s.id} type="button" onClick={() => onSample(s.id)}
                className="space-y-1 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{ts(`${s.id}.name`)}</span>
                  <Badge variant="secondary" className="uppercase">{s.format}</Badge>
                </span>
                <span className="block text-sm text-muted-foreground">{ts(`${s.id}.desc`)}</span>
              </button>
            ))}
          </div>
        </section>

        {projects.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold"><Database className="size-4" />{t("existingTitle")}</h3>
            <ul className="divide-y rounded-lg border bg-card">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{t("tablesCount", { count: p.tableNames.length })} · {fmt.format(new Date(p.updatedAt))}</span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onOpen(p.id)}>{t("open")}</Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
