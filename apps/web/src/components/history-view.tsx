"use client";

import { Download, History, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { generate } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useErrorText } from "@/hooks/use-error-text";
import { IconButton } from "@/components/icon-button";
import { useRouter } from "@/i18n/navigation";
import { downloadFile } from "@/lib/download";
import { clearHistory, loadHistory, removeHistory, type HistoryEntry } from "@/lib/history";
import { saveSchema, saveSettings } from "@/lib/studio-state";

export function HistoryView() {
  const t = useTranslations("historyPage");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(loadHistory()), []);

  const open = (h: HistoryEntry) => {
    if (h.schema) saveSchema(h.schema);
    saveSettings(h.settings);
    router.push("/");
  };

  const again = async (h: HistoryEntry) => {
    if (!h.schema) return;
    setBusy(h.id);
    setError(null);
    try {
      const r = await generate({ schema: h.schema, ...h.settings, bundle: true, now: h.now });
      if (!r.ok) setError(r.error);
      else r.files.forEach(downloadFile);
    } finally {
      setBusy(null);
    }
  };

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader
        icon={<History />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          items?.length ? (
            <IconButton variant="outline" size="icon" label={t("clearAll")} onClick={() => { clearHistory(); setItems([]); }}><Trash2 /></IconButton>
          ) : null
        }
      />
      {error && <p role="alert" className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:mx-6">{errorText(error)}</p>}
      {items && items.length === 0 && <p className="p-12 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      {items && items.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {["when", "action", "format", "locale", "tables", "rows"].map((k) => (
                  <th key={k} className="px-4 py-3 font-medium first:md:pl-6">{t(`cols.${k}`)}</th>
                ))}
                <th className="px-4 py-3 md:pr-6" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap px-4 py-3 md:pl-6">{fmt.format(new Date(h.at))}</td>
                  <td className="px-4 py-3"><Badge variant={h.kind === "export" ? "default" : "secondary"}>{t(`kind.${h.kind}`)}</Badge></td>
                  <td className="px-4 py-3 font-mono">{h.settings.format}{h.settings.format === "sql" ? ` · ${h.settings.dialect}` : ""}</td>
                  <td className="px-4 py-3 font-mono">{h.settings.locale}</td>
                  <td className="px-4 py-3 tabular-nums">{h.tables}</td>
                  <td className="px-4 py-3 tabular-nums">{h.rows}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right md:pr-6">
                    <IconButton variant="ghost" label={t("open")} disabled={!h.schema} onClick={() => open(h)}><RotateCcw /></IconButton>
                    <IconButton variant="ghost" label={t("exportAgain")} disabled={!h.schema || busy === h.id} onClick={() => again(h)}><Download /></IconButton>
                    <IconButton variant="ghost" label={t("delete")} onClick={() => { removeHistory(h.id); setItems(loadHistory()); }}><Trash2 /></IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
