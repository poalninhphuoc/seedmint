"use client";

import { Check, ChevronDown, Database, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadProjects, type Project } from "@/lib/history";

/** The open project's name in the header; the menu switches to another one or starts a new one. */
export function ProjectSwitcher({ activeId, onSwitch, onNew }: { activeId: string; onSwitch: (id: string) => void; onNew: () => void }) {
  const t = useTranslations("gate");
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => setProjects(loadProjects()), [activeId]);
  const active = projects.find((p) => p.id === activeId);
  return (
    <DropdownMenu onOpenChange={(o) => o && setProjects(loadProjects())}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="max-w-48" aria-label={t("switch")}>
          <Database /><span className="truncate">{active?.name ?? t("switch")}</span><ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("projects")}</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => p.id !== activeId && onSwitch(p.id)}>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.id === activeId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNew}><Plus />{t("newOrSample")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
