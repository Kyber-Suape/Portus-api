import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/HttpErrors";
import { verifyToken } from "../utils/jwt";

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de acesso não informado.");
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.user = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Token de acesso inválido ou expirado.");
  }

  next();
}
