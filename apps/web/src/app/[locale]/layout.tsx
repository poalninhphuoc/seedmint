import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { alternates, siteUrl } from "@/lib/seo";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: siteUrl,
    title: { default: t("title"), template: "%s · seedmint" },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
    alternates: alternates(locale, "/"),
    openGraph: { type: "website", siteName: "seedmint", title: t("title"), description: t("description"), locale },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "seedmint",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    description: t("description"),
    license: "https://opensource.org/licenses/MIT",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-svh">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <NextIntlClientProvider>
          <TooltipProvider>
            <SidebarProvider className="fixed inset-0 min-h-0">
              <AppSidebar />
              <SidebarInset className="min-w-0 overflow-hidden">{children}</SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
