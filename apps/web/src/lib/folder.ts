import type { SourceFile } from "@seedmint/core";

const SCHEMA_EXT = /\.(prisma|sql|ts|tsx|mts|json|dbml|graphql|gql|ya?ml)$/;
const SKIP_DIR = /(^|\/)(node_modules|\.git|\.next|\.turbo|dist|build|coverage)(\/|$)/;
const MAX_FILE = 1_000_000;

/** Attributes that make a file input pick a whole folder. */
export const folderInputProps = { webkitdirectory: "", directory: "" } as Record<string, string>;

/** Reads the schema-looking files from a folder chosen with a directory input. */
export async function readFolder(files: FileList): Promise<SourceFile[]> {
  const picked = Array.from(files).filter((f) => SCHEMA_EXT.test(f.name) && !SKIP_DIR.test(f.webkitRelativePath) && f.size < MAX_FILE);
  return Promise.all(picked.map(async (f) => ({ path: f.webkitRelativePath || f.name, content: await f.text() })));
}
