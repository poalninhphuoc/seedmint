import type { StudioSettings } from "@/lib/studio-state";

export interface SharedStudio {
  schema: string;
  from: StudioSettings["from"];
  locale: string;
  rows: number;
  seed: number;
  format: StudioSettings["format"];
}

/** Links longer than this get cut by chat apps and some servers. */
export const MAX_LINK = 8000;

const toBase64Url = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** The schema and main settings live in the URL hash, so the link never reaches a server. */
export const shareHash = (v: SharedStudio) => `#s=${toBase64Url(JSON.stringify(v))}`;

export function readShareHash(hash: string): Partial<SharedStudio> | null {
  const m = hash.match(/^#s=([\w-]+)$/);
  if (!m) return null;
  try {
    const o = JSON.parse(fromBase64Url(m[1]));
    return o && typeof o.schema === "string" ? o : null;
  } catch {
    return null;
  }
}
