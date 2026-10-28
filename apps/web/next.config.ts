import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  // The core parses TypeScript with the compiler API, so keep it out of the bundle.
  serverExternalPackages: ["typescript", "@seedmint/core", "@faker-js/faker", "exceljs"],
  // Imported project folders arrive as one request.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default withNextIntl(config);
