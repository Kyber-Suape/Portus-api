import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { validate } from "../../shared/middlewares/validate";
import { requirePermission } from "../permissions/require-permission.middleware";
import { getMyOrganization, updateMyOrganization } from "./organizations.controller";
import { updateOrganizationSchema } from "./organizations.schemas";

export const organizationsRouter = Router();

organizationsRouter.use(authMiddleware);

/**
 * @swagger
 * /organizations/me:
 *   get:
 *     summary: Retorna a organização do usuário autenticado
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Organização carregada }
 *       401: { description: Não autenticado }
 */
organizationsRouter.get("/me", getMyOrganization);

/**
 * @swagger
 * /organizations/me:
 *   patch:
 *     summary: Atualiza a organização do usuário autenticado
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Organização atualizada }
 *       403: { description: Sem a permissão organization:update }
 *       409: { description: CNPJ já cadastrado para outra organização }
 */
organizationsRouter.patch(
  "/me",
  requirePermission("organization:update"),
  validate(updateOrganizationSchema),
  updateMyOrganization,
);
