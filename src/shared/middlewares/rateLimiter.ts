import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

// Em testes, supertest faz muitas requisições rápidas a partir do mesmo "IP" de loopback;
// um limite de produção bloquearia a própria suíte. Mantemos os limites reais fora de NODE_ENV=test.
const isTest = env.NODE_ENV === "test";

/** Limite geral para toda a API. */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limite mais restrito para rotas sensíveis a força bruta (login/registro). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});
