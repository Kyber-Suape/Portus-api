import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { BadRequestError } from "../../shared/errors/HttpErrors";
import { aiService } from "./ai.service";
import type { RdoTextSuggestionInput } from "./ai.schemas";

export const generateRdoTextSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RdoTextSuggestionInput;
  const result = aiService.generateRdoTextSuggestion(body);
  res.status(200).json(success(result, "Sugestão de texto gerada com sucesso."));
});

export const transcribeAudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError("Envie um arquivo de áudio.");
  }
  const result = aiService.transcribeAudio();
  res.status(200).json(success(result, "Áudio transcrito com sucesso."));
});
