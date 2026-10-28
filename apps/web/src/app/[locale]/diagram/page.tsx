import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DiagramView } from "@/components/diagram-view";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "diagramPage" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/diagram") };
}

export default async function DiagramPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DiagramView />;
}
