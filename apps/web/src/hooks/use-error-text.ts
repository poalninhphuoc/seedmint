"use client";

import { useTranslations } from "next-intl";
import { errorKey } from "@/lib/errors";

/** Returns a function that shows a server error in the current UI language; unknown messages pass through. */
export function useErrorText() {
  const t = useTranslations("errors");
  return (message: string) => {
    const hit = errorKey(message);
    return hit ? t(hit.key, hit.values) : message;
  };
}
