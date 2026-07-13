// Standalone Vitest config — intentionally separate from vite.config.ts so we
// don't pull in the @lovable.dev/vite-tanstack-config wrapper's app plugins
// (tanstackStart, nitro, componentTagger, etc.) which have no place in unit
// tests and can conflict when instantiated twice.
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
