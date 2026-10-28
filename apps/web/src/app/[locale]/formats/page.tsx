import { OUTPUT_FORMATS } from "@seedmint/core";
import { FileOutput } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "formatsPage" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/formats") };
}

export default async function FormatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("formatsPage");
  return (
    <>
      <PageHeader icon={<FileOutput />} title={t("title")} subtitle={t("subtitle")} />
      <div className="min-h-0 flex-1 overflow-y-auto">
      <dl className="divide-y">
        {OUTPUT_FORMATS.map((f) => (
          <div key={f} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:gap-6 md:px-6">
            <dt className="w-28 shrink-0 font-mono text-sm font-medium">{f}</dt>
            <dd className="text-sm text-muted-foreground">{t(`items.${f}`)}</dd>
          </div>
        ))}
      </dl>
      </div>
    </>
  );
}
