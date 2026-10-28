"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/icon-button";
import { THEME_KEY } from "@/lib/theme";

export function ThemeToggle() {
  const t = useTranslations("nav");
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      /* storage blocked: the choice just lasts for this visit */
    }
  };
  return (
    <IconButton variant="outline" size="icon" onClick={toggle} label={t("theme")} className="bg-card">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </IconButton>
  );
}
