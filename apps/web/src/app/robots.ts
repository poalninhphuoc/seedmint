import type { MetadataRoute } from "next";
import { SITE_URL } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
