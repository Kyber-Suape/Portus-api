import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { validate } from "../../shared/middlewares/validate";
import { userIdParamsSchema } from "../users/users.schemas";
import { getCatalog, getRoleDefaults, getUserPermissions, updateUserPermissions } from "./permissions.controller";
import { requirePermission } from "./require-permission.middleware";
import { roleParamsSchema, updateUserPermissionsSchema } from "./permissions.schemas";

export const permissionsRouter = Router();

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Lista o catálogo completo de permissões (público — usado pelo wizard de Cadastro)
 *     tags: [Permissions]
 *     responses:
 *       200: { description: Catálogo de permissões }
 */
permissionsRouter.get("/permissions", getCatalog);

/**
 * @swagger
 * /roles/{role}/permissions:
 *   get:
 *     summary: Lista as permissões padrão de um perfil (público — usado pelo wizard de Cadastro)
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string, enum: [SYSTEM_ADMIN, SUAPE_INSPECTOR, EXTERNAL_INSPECTOR, SUPPLIER, AUDITOR] }
 *     responses:
 *       200: { description: Permissões padrão do perfil }
 */
permissionsRouter.get("/roles/:role/permissions", validate(roleParamsSchema, "params"), getRoleDefaults);

/**
 * @swagger
 * /users/{id}/permissions:
 *   get:
 *     summary: Lista as permissões efetivas de um usuário da organização
 *     tags: [Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permissões efetivas do usuário }
 *       401: { description: Não autenticado }
 *       403: { description: Sem a permissão permissions:read }
 *       404: { description: Usuário não encontrado na organização }
 */
permissionsRouter.get(
  "/users/:id/permissions",
  authMiddleware,
  requirePermission("permissions:read"),
  validate(userIdParamsSchema, "params"),
  getUserPermissions,
);

/**
 * @swagger
 * /users/{id}/permissions:
 *   patch:
 *     summary: Atualiza as permissões (overrides) de um usuário da organização
 *     tags: [Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permissões atualizadas }
 *       401: { description: Não autenticado }
 *       403: { description: Sem a permissão permissions:update, ou tentativa de editar as próprias permissões }
 *       404: { description: Usuário não encontrado na organização }
 */
permissionsRouter.patch(
  "/users/:id/permissions",
  authMiddleware,
  requirePermission("permissions:update"),
  validate(userIdParamsSchema, "params"),
  validate(updateUserPermissionsSchema),
  updateUserPermissions,
);
