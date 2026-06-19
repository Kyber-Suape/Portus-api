import { prisma } from "../src/config/database";
import { env } from "../src/config/env";
import { seedPermissionsCatalog } from "../prisma/permissions-catalog";

/**
 * Roda uma única vez antes de toda a suíte (Vitest `globalSetup`), num processo próprio.
 * Semeia o catálogo de permissões + defaults por papel no banco de teste — dados de
 * referência que `resetDatabase()` (por design) nunca apaga entre os testes.
 *
 * Importa `src/config/database` (não cria um `PrismaClient` à parte) para garantir que
 * a configuração de teste (`test.env` em vitest.config.ts) já tenha sido aplicada antes
 * de qualquer conexão.
 */
export default async function setup(): Promise<void> {
  if (env.NODE_ENV !== "test") {
    throw new Error("global-setup só pode rodar com NODE_ENV=test.");
  }

  await seedPermissionsCatalog(prisma);
  await prisma.$disconnect();
}
