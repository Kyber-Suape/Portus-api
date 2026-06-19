import type { Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/HttpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { permissionsService } from "./permissions.service";

/** Exige uma permissão efetiva (default do papel + overrides). 401 sem sessão, 403 sem a permissão. */
export function requirePermission(key: string) {
  return asyncHandler(async (req: Request, _res: Response, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const effectiveKeys = await permissionsService.getEffectiveKeys(req.user.id, req.user.role);
    if (!effectiveKeys.includes(key)) {
      throw new ForbiddenError(`Permissão necessária: ${key}`);
    }

    next();
  });
}
