import type { Metadata } from "next";
import { routing, SITE_URL } from "@/i18n/routing";

/** Canonical + hreflang alternates for a path such as "/" or "/locales". */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const url = (l: string) => `/${l}${path === "/" ? "" : path}`;
  return {
    canonical: url(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
      "x-default": url(routing.defaultLocale),
    },
  };
}

export const siteUrl = new URL(SITE_URL);
