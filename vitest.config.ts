import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.ts?(x)"],
    exclude: [...configDefaults.exclude, "e2e/**"],
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@onehub/ui": path.resolve(__dirname, "./packages/ui/src/index.ts"),
    },
  },
});
