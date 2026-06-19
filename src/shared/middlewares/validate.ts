import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

/** Valida (e normaliza/coage) `req[target]` contra um schema Zod, substituindo o valor original pelo parseado. */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    req[target] = parsed;
    next();
  };
}
