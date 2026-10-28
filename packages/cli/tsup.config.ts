import { defineConfig } from "tsup";

// The CLI bundles @seedmint/core so `npx seedmint` is a single package.
export default defineConfig({
  entry: { cli: "src/cli.ts", index: "src/index.ts" },
  format: ["esm"],
  dts: { entry: { index: "src/index.ts" }, resolve: true },
  noExternal: ["@seedmint/core"],
  external: ["yaml"],
  clean: true,
});
