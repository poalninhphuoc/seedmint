import type { MetadataRoute } from "next";
import { routing, SITE_URL } from "@/i18n/routing";

const PATHS = ["", "/diagram", "/locales", "/formats"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((p) =>
    routing.locales.map((l) => ({
      url: `${SITE_URL}/${l}${p}`,
      lastModified: new Date(),
      alternates: { languages: Object.fromEntries(routing.locales.map((x) => [x, `${SITE_URL}/${x}${p}`])) },
    })),
  );
}
