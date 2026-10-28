import type { OutputFile } from "@/app/actions";

const MIME: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export function downloadFile(f: OutputFile) {
  let blob: Blob;
  if (f.binary) {
    const bytes = Uint8Array.from(atob(f.content), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: MIME[f.name.split(".").pop() ?? ""] ?? "application/octet-stream" });
  } else {
    blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
  a.click();
  URL.revokeObjectURL(url);
}
