import { SUPPORTED_LOCALES, regionDefaults } from "@seedmint/core";
import { setRequestLocale } from "next-intl/server";
import { Studio } from "@/components/studio";
import { localeLabel } from "@/lib/locale-labels";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const initial = SUPPORTED_LOCALES.includes(locale.split("-")[0]) ? locale.split("-")[0] : "en";
  return (
    <Studio
      locales={SUPPORTED_LOCALES.map((code) => ({ code, label: localeLabel(code, locale) }))}
      regions={Object.fromEntries(SUPPORTED_LOCALES.map((c) => [c, regionDefaults(c)]))}
      initialLocale={initial}
    />
  );
}
