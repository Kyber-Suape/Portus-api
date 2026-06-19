import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/** Instância única do Prisma Client, reaproveitada em toda a aplicação (e nos testes de integração). */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
