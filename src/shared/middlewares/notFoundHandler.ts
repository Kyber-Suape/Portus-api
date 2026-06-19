import type { Request, Response } from "express";
import type { ApiErrorResponse } from "../types/api";

export function notFoundHandler(req: Request, res: Response<ApiErrorResponse>) {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}
