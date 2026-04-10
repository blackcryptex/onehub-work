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
});
