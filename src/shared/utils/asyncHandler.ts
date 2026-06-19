import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Encaminha rejeições de handlers assíncronos para o errorHandler global, sem try/catch repetido em cada controller. */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
