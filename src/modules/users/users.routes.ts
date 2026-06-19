import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { validate } from "../../shared/middlewares/validate";
import { requirePermission } from "../permissions/require-permission.middleware";
import { deleteUser, inviteUser, listUsers, updateUser } from "./users.controller";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamsSchema } from "./users.schemas";

export const usersRouter = Router();

usersRouter.use(authMiddleware);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista os usuários da organização do usuário autenticado
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [SYSTEM_ADMIN, SUAPE_INSPECTOR, EXTERNAL_INSPECTOR, SUPPLIER, AUDITOR] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INVITED, INACTIVE] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista paginada de usuários, content: { application/json: { schema: { $ref: '#/components/schemas/ApiSuccess' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Sem a permissão users:read }
 */
usersRouter.get("/", requirePermission("users:read"), validate(listUsersQuerySchema, "query"), listUsers);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cria um novo usuário com acesso real (senha) na organização do administrador autenticado
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Usuário criado }
 *       403: { description: Sem a permissão users:create }
 *       409: { description: E-mail ou CPF já cadastrado }
 */
usersRouter.post("/", requirePermission("users:create"), validate(createUserSchema), inviteUser);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Atualiza um usuário da organização
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuário atualizado }
 *       403: { description: Sem a permissão users:update }
 *       404: { description: Usuário não encontrado na organização }
 */
usersRouter.patch(
  "/:id",
  requirePermission("users:update"),
  validate(userIdParamsSchema, "params"),
  validate(updateUserSchema),
  updateUser,
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Remove um usuário da organização
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuário removido }
 *       403: { description: Sem a permissão users:delete, ou tentativa de autoexclusão/remoção do último administrador }
 *       404: { description: Usuário não encontrado na organização }
 */
usersRouter.delete(
  "/:id",
  requirePermission("users:delete"),
  validate(userIdParamsSchema, "params"),
  deleteUser,
);
