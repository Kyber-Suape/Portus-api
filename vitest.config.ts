import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // Configuração do banco/segredos de teste fica só aqui — não há mais um arquivo `.env.test`.
    // `env.ts` carrega `.env` sem `override`, então essas variáveis (já definidas no processo
    // antes do require) sempre vencem o `.env` de desenvolvimento.
    env: {
      DATABASE_URL: "postgresql://portus:portus@localhost:5432/portus_test?schema=public",
      TEST_DATABASE_URL: "postgresql://portus:portus@localhost:5432/portus_test?schema=public",
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "1h",
      UPLOADS_DIR: "uploads-test",
    },
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
