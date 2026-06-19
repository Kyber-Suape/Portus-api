import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// `override: true` é necessário porque `@prisma/client` carrega seu próprio `.env`
// (sempre o arquivo `.env`, nunca `.env.test`) como efeito colateral ao ser importado —
// se isso acontecer antes desta linha, DATABASE_URL ficaria "presa" no valor de
// desenvolvimento mesmo em NODE_ENV=test, já que o dotenv não sobrescreve por padrão.
loadDotenv({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env", override: true });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET deve ter ao menos 8 caracteres"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().optional(),
  UPLOADS_DIR: z.string().default("uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar configuração de ambiente.");
}

export const env = {
  ...parsed.data,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN ?? parsed.data.FRONTEND_URL,
};
