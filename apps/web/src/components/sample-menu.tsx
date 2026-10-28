"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SAMPLES, type Sample } from "@/lib/sample";

/** Dropdown of ready-made schemas; `children` is the trigger button. */
export function SampleMenu({ onPick, children }: { onPick: (sample: Sample) => void; children: ReactNode }) {
  const t = useTranslations("samples");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("title")}</DropdownMenuLabel>
        {SAMPLES.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => onPick(s)} className="flex-col items-start gap-0.5">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{t(`${s.id}.name`)}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{s.format}</span>
            </span>
            <span className="text-xs text-muted-foreground">{t(`${s.id}.desc`)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
