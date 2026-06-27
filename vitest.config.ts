import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkg = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@rir/common": pkg("common"),
      "@rir/core": pkg("core"),
      "@rir/ir": pkg("ir"),
      "@rir/graph": pkg("graph"),
      "@rir/ontology": pkg("ontology"),
      "@rir/storage": pkg("storage"),
      "@rir/code-compiler": pkg("code-compiler"),
      "@rir/compiler": pkg("compiler"),
      "@rir/document-compiler": pkg("document-compiler"),
      "@rir/builder-engine": pkg("builder-engine"),
      "@rir/passes": pkg("passes"),
      "@rir/closure": pkg("closure"),
      "@rir/coverage": pkg("coverage"),
      "@rir/consistency": pkg("consistency"),
      "@rir/query-engine": pkg("query-engine"),
      "@rir/semantic": pkg("semantic"),
      "@rir/telemetry": pkg("telemetry"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts", "packages/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["packages/**/src/**", "apps/**/src/**"],
    },
  },
});
