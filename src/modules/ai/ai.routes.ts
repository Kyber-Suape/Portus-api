import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";
import { validate } from "../../shared/middlewares/validate";
import { requirePermission } from "../permissions/require-permission.middleware";
import { generateRdoTextSuggestion, transcribeAudio } from "./ai.controller";
import { rdoTextSuggestionSchema } from "./ai.schemas";

export const aiRouter = Router();

aiRouter.use(authMiddleware);

/** Upload de áudio mantido só em memória — a transcrição é canned, o arquivo nunca é persistido em disco. */
const audioUpload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /ai/rdo-text-suggestion:
 *   post:
 *     summary: Gera uma sugestão de texto para uma atividade do RDO (placeholder estrutural, sem IA real)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sugestão gerada }
 *       403: { description: Sem a permissão ai:generate_rdo_text }
 */
aiRouter.post(
  "/rdo-text-suggestion",
  requirePermission("ai:generate_rdo_text"),
  validate(rdoTextSuggestionSchema),
  generateRdoTextSuggestion,
);

/**
 * @swagger
 * /ai/audio-transcription:
 *   post:
 *     summary: Transcreve um áudio para texto (placeholder estrutural, sem IA real)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Transcrição gerada }
 *       400: { description: Arquivo de áudio ausente }
 *       403: { description: Sem a permissão ai:transcribe_audio }
 */
aiRouter.post(
  "/audio-transcription",
  requirePermission("ai:transcribe_audio"),
  audioUpload.single("file"),
  transcribeAudio,
);
