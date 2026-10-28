/** Returns the text between the bracket at `openIdx` and its matching close, and the index after it. */
export function readBalanced(src: string, openIdx: number): { inner: string; end: number } {
  const open = src[openIdx];
  const close = open === "{" ? "}" : open === "(" ? ")" : "]";
  let depth = 0;
  let quote = "";
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return { inner: src.slice(openIdx + 1, i), end: i + 1 };
  }
  return { inner: src.slice(openIdx + 1), end: src.length };
}

/** Splits on `sep` at bracket depth 0, ignoring separators inside strings. */
export function splitTop(text: string, sep = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === sep && depth === 0) {
      parts.push(text.slice(last, i));
      last = i + 1;
    }
  }
  parts.push(text.slice(last));
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/--.*$/gm, "");
}

export function unquote(s: string): string {
  return s.trim().replace(/^["'`\[]|["'`\]]$/g, "");
}
