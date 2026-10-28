/** Server actions and the core parsers speak English. This maps their known messages to keys of the `errors` catalog. */
const PATTERNS: [RegExp, string][] = [
  [/^Schema is empty/, "schemaEmpty"],
  [/^Schema is too large/, "schemaTooLarge"],
  [/^The folder is too large/, "folderTooLarge"],
  [/^No tables found in (\w+) input/, "noTables"],
  [/^Could not detect the input format/, "detectFailed"],
  [/^No schema files found/, "noSchemaFiles"],
  [/^Could not generate data/, "generateFailed"],
  [/^Could not read the schema/, "readFailed"],
  [/^Could not read the folder/, "folderFailed"],
];

export function errorKey(message: string): { key: string; values: Record<string, string> } | null {
  for (const [re, key] of PATTERNS) {
    const m = message.match(re);
    if (m) return { key, values: { format: m[1] ?? "" } };
  }
  return null;
}
