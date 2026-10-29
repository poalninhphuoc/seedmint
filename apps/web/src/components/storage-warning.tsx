"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStorageFailed } from "@/lib/storage";

/** Shown when the browser refuses to save, so a reload would lose the latest work. */
export function StorageWarning() {
  const t = useTranslations("studio");
  if (!useStorageFailed()) return null;
  return (
    <p role="alert" className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive md:px-6">
      <TriangleAlert className="size-4 shrink-0" />{t("storageFull")}
    </p>
  );
}
