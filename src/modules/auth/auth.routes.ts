import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { authRateLimiter } from "../../shared/middlewares/rateLimiter";
import { validate } from "../../shared/middlewares/validate";
import { login, me, register, updateMe } from "./auth.controller";
import { loginSchema, registerSchema, updateMeSchema } from "./auth.schemas";

export const authRouter = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Cadastra a organização, o Administrador do Sistema e (opcionalmente) usuários convidados
 *     description: Operação transacional — se qualquer etapa falhar, nada é persistido.
 *     tags: [Auth]
 *     responses:
 *       201: { description: Cadastro realizado com sucesso }
 *       400: { description: Dados inválidos }
 *       409: { description: CNPJ, e-mail ou CPF já cadastrados }
 */
authRouter.post("/register", authRateLimiter, validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica um usuário e retorna um token JWT
 *     tags: [Auth]
 *     responses:
 *       200: { description: Login realizado com sucesso }
 *       401: { description: Credenciais inválidas }
 */
authRouter.post("/login", authRateLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna o usuário autenticado e sua organização
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sessão carregada com sucesso }
 *       401: { description: Não autenticado }
 */
authRouter.get("/me", authMiddleware, me);

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Atualiza o perfil do usuário autenticado (nome, e-mail, telefone, CPF e, opcionalmente, senha)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil atualizado com sucesso }
 *       401: { description: Não autenticado }
 *       409: { description: E-mail ou CPF já cadastrado }
 */
authRouter.patch("/me", authMiddleware, validate(updateMeSchema), updateMe);
