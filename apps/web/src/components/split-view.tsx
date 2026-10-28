"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const QUERY = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Two panels with one divider that runs the full height and can be dragged. Each panel scrolls on its own.
 * Below the `lg` breakpoint the panels simply stack.
 */
export function SplitView({ left, right, defaultLeft = 42, id }: { left: ReactNode; right: ReactNode; defaultLeft?: number; id: string }) {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);

  if (!wide)
    return (
      <div className="min-h-0 flex-1 divide-y overflow-y-auto">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    );

  return (
    <ResizablePanelGroup orientation="horizontal" id={id} className="min-h-0 flex-1">
      <ResizablePanel id={`${id}-left`} defaultSize={`${defaultLeft}%`} minSize="25%" className="overflow-hidden">
        <div className="h-full overflow-y-auto">{left}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id={`${id}-right`} defaultSize={`${100 - defaultLeft}%`} minSize="30%" className="overflow-hidden">
        <div className="h-full overflow-y-auto">{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
