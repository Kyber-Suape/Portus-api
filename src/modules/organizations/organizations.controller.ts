import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { organizationsService } from "./organizations.service";
import type { UpdateOrganizationInput } from "./organizations.schemas";

export const getMyOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organization = await organizationsService.getMine(req.user!.organizationId);
  res.status(200).json(success(organization, "Organização carregada com sucesso."));
});

export const updateMyOrganization = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateOrganizationInput;
  const organization = await organizationsService.updateMine(req.user!.organizationId, body);
  res.status(200).json(success(organization, "Organização atualizada com sucesso."));
});
