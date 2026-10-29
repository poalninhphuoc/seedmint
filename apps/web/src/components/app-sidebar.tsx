"use client";

import { BookOpenText, FileOutput, History, Languages, Network, Sprout, Table2, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

const GITHUB = "https://github.com/poalninhphuoc/seedmint";

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const groups = [
    { label: t("nav.generate"), items: [
        { href: "/", icon: Wand2, label: t("nav.studio") },
        { href: "/diagram", icon: Network, label: t("nav.diagram") },
        { href: "/data", icon: Table2, label: t("nav.data") },
        { href: "/history", icon: History, label: t("nav.history") },
      ] },
    {
      label: t("nav.explore"),
      items: [
        { href: "/locales", icon: Languages, label: t("nav.locales") },
        { href: "/formats", icon: FileOutput, label: t("nav.formats") },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4 py-0 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background group-data-[collapsible=icon]:size-8">
            <Sprout className="size-5" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-serif text-lg font-semibold">{t("brand.name")}</p>
            <p className="truncate text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarMenu>
              {g.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} size="lg" className="group-data-[collapsible=icon]:justify-center">
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:items-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.docs")}>
              <a href={`${GITHUB}/blob/main/docs/roadmap.md`} target="_blank" rel="noreferrer">
                <BookOpenText />
                <span className="group-data-[collapsible=icon]:hidden">{t("nav.docs")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.github")}>
              <a href={GITHUB} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
                </svg>
                <span className="group-data-[collapsible=icon]:hidden">{t("nav.github")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
