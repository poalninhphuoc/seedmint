import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "vi", "zh-CN", "ja", "ko", "es"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];

/** Endonyms shown in the language switcher. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
