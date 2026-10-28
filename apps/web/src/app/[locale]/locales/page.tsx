import { SUPPORTED_LOCALES, mint, parseSchema } from "@seedmint/core";
import { Languages } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { alternates } from "@/lib/seo";
import { localeLabel } from "@/lib/locale-labels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "localesPage" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/locales") };
}

export default async function LocalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("localesPage");
  const schema = parseSchema("people(name, email, phone, address)", "dsl");

  return (
    <>
      <PageHeader icon={<Languages />} title={t("title")} subtitle={t("subtitle")} />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium md:px-6">{t("title")}</th>
              {["name", "phone", "address"].map((k) => <th key={k} className="px-4 py-3 font-medium">{k}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {SUPPORTED_LOCALES.map((code) => {
              const row = mint({ schema, locale: code, rows: 1, seed: 7 }).people[0] as Record<string, unknown>;
              return (
                <tr key={code}>
                  <td className="whitespace-nowrap px-4 py-3 md:px-6">
                    {localeLabel(code, locale)} <span className="ml-1 font-mono text-xs text-muted-foreground">{code}</span>
                  </td>
                  {["name", "phone", "address"].map((k) => (
                    <td key={k} className="px-4 py-3">{String(row[k] ?? "")}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
