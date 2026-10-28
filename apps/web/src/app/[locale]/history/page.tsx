import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HistoryView } from "@/components/history-view";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "historyPage" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/history"), robots: { index: false } };
}

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HistoryView />;
}
