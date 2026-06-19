import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../errors/HttpErrors";

export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError("Seu perfil não tem permissão para esta ação.");
    }

    next();
  };
}
