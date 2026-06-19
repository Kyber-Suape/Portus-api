import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { requirePermission } from "../permissions/require-permission.middleware";
import { getAlerts, getRdosBreakdown, getSummary, getWorksBreakdown } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Resumo geral do dashboard (obras ativas, contratos, RDOs, SLA, alertas)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resumo carregado }
 *       403: { description: Sem a permissão dashboard:read }
 */
dashboardRouter.get("/summary", requirePermission("dashboard:read"), getSummary);

/**
 * @swagger
 * /dashboard/works:
 *   get:
 *     summary: Indicadores de obras (contagem por status, contratos próximos do vencimento)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Indicadores carregados }
 *       403: { description: Sem a permissão dashboard:works_read }
 */
dashboardRouter.get("/works", requirePermission("dashboard:works_read"), getWorksBreakdown);

/**
 * @swagger
 * /dashboard/rdos:
 *   get:
 *     summary: Indicadores de RDOs (contagem por status, RDOs recentes)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Indicadores carregados }
 *       403: { description: Sem a permissão dashboard:rdos_read }
 */
dashboardRouter.get("/rdos", requirePermission("dashboard:rdos_read"), getRdosBreakdown);

/**
 * @swagger
 * /dashboard/alerts:
 *   get:
 *     summary: Alertas críticos (contratos próximos do vencimento, RDOs atrasados)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alertas carregados }
 *       403: { description: Sem a permissão dashboard:alerts_read }
 */
dashboardRouter.get("/alerts", requirePermission("dashboard:alerts_read"), getAlerts);
