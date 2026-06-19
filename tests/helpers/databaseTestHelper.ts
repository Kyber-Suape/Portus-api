import { prisma } from "../../src/config/database";
import { env } from "../../src/config/env";

function assertRunningAgainstTestDatabase() {
  if (env.NODE_ENV !== "test") {
    throw new Error(
      "Recusando limpar o banco: NODE_ENV não é 'test'. Rode via `npm test` (vitest aplica a config de teste automaticamente).",
    );
  }

  const guard = process.env.TEST_DATABASE_URL;
  if (guard && guard !== env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não corresponde a TEST_DATABASE_URL — abortando para proteger dados reais.",
    );
  }
}

/**
 * Limpa as tabelas em ordem segura de FK. `rdo` primeiro e explicitamente: seus filhos
 * (rdo_status_history, rdo_reviews, rdo_comments, rdo_evidences) cascateiam por `rdoId`, mas
 * também têm FKs RESTRICT para `users` (changedById/reviewerId/authorId/uploadedById) — a
 * ordem de execução de cascades multi-nível do Postgres não é garantida, então apagar
 * `organization` direto (que cascateia para `users` E para `rdos`/`works` em paralelo) pode
 * tentar remover um `user` antes do cascade ter limpado as linhas que o referenciam, violando
 * a constraint RESTRICT. `work` também tem FKs RESTRICT para `users` (suapeInspectorId/
 * externalInspectorId/contractManagerId) e é referenciado por `rdo.workId`, por isso sai depois
 * de `rdo` e antes de `organization`. Só funciona em NODE_ENV=test.
 */
export async function resetDatabase(): Promise<void> {
  assertRunningAgainstTestDatabase();
  await prisma.rdo.deleteMany();
  await prisma.work.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
