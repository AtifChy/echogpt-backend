import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/unit/**/*.spec.ts"],
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.service.ts", "src/**/*.guard.ts", "src/**/*.strategy.ts"],
      exclude: ["src/main.ts", "src/prisma/contract.d.ts"],
    },
  },
});
