import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataAdmin } from "@/components/data-admin";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dataPage" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/data"), robots: { index: false } };
}

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DataAdmin />;
}
