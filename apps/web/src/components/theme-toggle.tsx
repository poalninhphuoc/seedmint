"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "seedmint:theme";

/** Runs before first paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

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
    <Button variant="outline" size="icon" onClick={toggle} aria-label={t("theme")} title={t("theme")} className="bg-card">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
