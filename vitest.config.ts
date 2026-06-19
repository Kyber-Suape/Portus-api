import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Os testes de integração compartilham um único banco Postgres de teste (sem isolamento
    // transacional por teste), então arquivos não podem rodar em paralelo sem corromper uns aos outros.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/config/swagger.ts",
        "src/shared/types/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
