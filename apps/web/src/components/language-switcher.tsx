"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type AppLocale } from "@/i18n/routing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(next) => start(() => router.replace(pathname, { locale: next as AppLocale }))}
    >
      <SelectTrigger aria-label={t("language")} className="w-[10.5rem] bg-card">
        <Globe className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l}>{LOCALE_LABELS[l]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
