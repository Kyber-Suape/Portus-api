import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import type { ApiErrorResponse } from "../types/api";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function formatPrismaUniqueConstraintError(error: Prisma.PrismaClientKnownRequestError) {
  const target = (error.meta?.target as string[] | undefined) ?? [];
  const field = target[0] ?? "campo";
  return {
    statusCode: 409,
    message: `Já existe um registro com este ${field}.`,
    errors: [{ field, message: "Valor já cadastrado." }],
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response<ApiErrorResponse>, next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Dados inválidos.",
      errors: formatZodError(err),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const { statusCode, message, errors } = formatPrismaUniqueConstraintError(err);
    res.status(statusCode).json({ success: false, message, errors });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Arquivo excede o tamanho máximo permitido." : "Falha no envio do arquivo.";
    res.status(400).json({ success: false, message });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  console.error("[unhandled error]", err);
  res.status(500).json({
    success: false,
    message: "Erro interno do servidor.",
  });
}
