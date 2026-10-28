"use client";

import { ChevronRight, FileText, Folder } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { ImportedFile } from "@/app/actions";
import { cn } from "@/lib/utils";

interface Node {
  name: string;
  dirs: Map<string, Node>;
  files: ImportedFile[];
}

function build(files: ImportedFile[]): Node {
  const root: Node = { name: "", dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur = root;
    for (const dir of parts.slice(0, -1)) {
      if (!cur.dirs.has(dir)) cur.dirs.set(dir, { name: dir, dirs: new Map(), files: [] });
      cur = cur.dirs.get(dir)!;
    }
    cur.files.push(f);
  }
  return root;
}

const count = (n: Node): number => n.files.length + [...n.dirs.values()].reduce((s, d) => s + count(d), 0);

/** The folder you imported, as a tree. Files that were read are marked with their table count; the rest are greyed out. */
export function FileTree({ files }: { files: ImportedFile[] }) {
  const t = useTranslations("studio");
  const root = useMemo(() => build(files), [files]);
  return (
    <div className="max-h-60 overflow-auto rounded-lg border bg-card p-2 text-[13px]" role="tree" aria-label={t("filesTitle")}>
      <Dir node={root} depth={0} t={t} />
    </div>
  );
}

function Dir({ node, depth, t }: { node: Node; depth: number; t: ReturnType<typeof useTranslations> }) {
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));
  const body = (
    <>
      {dirs.map((d) => (
        <details key={d.name} open={depth < 2} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded px-1 py-1 hover:bg-muted [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
            <Folder className="size-4 text-muted-foreground" />
            <span className="font-medium">{d.name}</span>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count(d)}</span>
          </summary>
          <div className="ml-2.5 border-l pl-2"><Dir node={d} depth={depth + 1} t={t} /></div>
        </details>
      ))}
      {files.map((f) => (
        <div key={f.path} role="treeitem" aria-selected={f.used} className={cn("flex items-center gap-1.5 rounded px-1 py-1", !f.used && "text-muted-foreground/70")}>
          <span className="size-3.5" />
          <FileText className={cn("size-4", f.used ? "text-brand" : "text-muted-foreground/60")} />
          <span className={cn("truncate", !f.used && "line-through decoration-muted-foreground/40")}>{f.path.split("/").pop()}</span>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {f.used ? (f.tables ? t("treeTables", { count: f.tables }) : "✓") : t("treeIgnored")}
          </span>
        </div>
      ))}
    </>
  );
  return depth === 0 ? <div className="space-y-0.5">{body}</div> : <div className="space-y-0.5">{body}</div>;
}
