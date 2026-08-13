import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL(
        "./src/test/database/server-only.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test:
    mode === "integration"
      ? {
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./src/test/database/setup.ts"],
          fileParallelism: false,
        }
      : {
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
}));
