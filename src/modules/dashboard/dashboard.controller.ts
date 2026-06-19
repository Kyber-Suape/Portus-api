import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { dashboardService } from "./dashboard.service";

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await dashboardService.getSummary(req.user!.organizationId);
  res.status(200).json(success(summary, "Resumo do dashboard carregado com sucesso."));
});

export const getWorksBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const breakdown = await dashboardService.getWorksBreakdown(req.user!.organizationId);
  res.status(200).json(success(breakdown, "Indicadores de obras carregados com sucesso."));
});

export const getRdosBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const breakdown = await dashboardService.getRdosBreakdown(req.user!.organizationId);
  res.status(200).json(success(breakdown, "Indicadores de RDOs carregados com sucesso."));
});

export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await dashboardService.getAlerts(req.user!.organizationId);
  res.status(200).json(success(alerts, "Alertas carregados com sucesso."));
});
