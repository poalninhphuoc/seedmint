"use client";

import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/icon-button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_MENU, type DIALECT_LABELS, type ExportFormat } from "@/lib/formats";

/** One button that holds every export: spreadsheets, text files, SQL per database, and code. */
export function ExportMenu({ busy, onExport }: { busy: boolean; onExport: (format: ExportFormat, dialect?: keyof typeof DIALECT_LABELS) => void }) {
  const t = useTranslations("studio");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton variant="outline" size="icon" disabled={busy} label={t("exportMenu")}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {EXPORT_MENU.map((g, i) => (
          <DropdownMenuGroup key={g.group}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t(`exportGroup.${g.group}`)}</DropdownMenuLabel>
            {g.items.map((it) => (
              <DropdownMenuItem key={it.label} onSelect={() => onExport(it.format, it.dialect)}>{it.label}</DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
