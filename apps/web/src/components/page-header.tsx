import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function PageHeader({ icon, title, subtitle, actions }: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
      <h1 className="shrink-0 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground xl:block">{subtitle}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
