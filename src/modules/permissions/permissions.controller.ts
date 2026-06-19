import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { permissionsService } from "./permissions.service";
import type { UpdateUserPermissionsInput } from "./permissions.schemas";

export const getCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const catalog = await permissionsService.getCatalog();
  res.status(200).json(success(catalog, "Catálogo de permissões carregado com sucesso."));
});

export const getRoleDefaults = asyncHandler(async (req: Request, res: Response) => {
  const role = req.params.role as UserRole;
  const keys = await permissionsService.getRoleDefaultKeys(role);
  res.status(200).json(success({ role, permissionKeys: keys }, "Permissões padrão do perfil carregadas."));
});

export const getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  const details = await permissionsService.getUserPermissionsDetailed(
    req.user!.organizationId,
    req.params.id,
  );
  res.status(200).json(success(details, "Permissões do usuário carregadas com sucesso."));
});

export const updateUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionKeys } = req.body as UpdateUserPermissionsInput;
  const details = await permissionsService.updateUserPermissions(
    req.user!.organizationId,
    req.user!.id,
    req.params.id,
    permissionKeys,
  );
  res.status(200).json(success(details, "Permissões atualizadas com sucesso."));
});
