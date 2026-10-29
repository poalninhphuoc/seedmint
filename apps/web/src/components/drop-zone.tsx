"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

/** Wraps a schema box: dropping files on it hands them to `onFiles`. */
export function DropZone({ onFiles, children }: { onFiles: (files: FileList) => void; children: ReactNode }) {
  const t = useTranslations("studio");
  const [over, setOver] = useState(false);
  return (
    <div className="relative"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => {
        setOver(false);
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}>
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--brand)] bg-background/85 text-sm font-medium">
          <Upload className="size-4" />{t("dropHere")}
        </div>
      )}
    </div>
  );
}
