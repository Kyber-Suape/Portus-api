import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { authService } from "./auth.service";
import type { LoginInput, RegisterInput, UpdateMeInput } from "./auth.schemas";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterInput;
  const result = await authService.register(body);
  res.status(201).json(success(result, "Cadastro realizado com sucesso."));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as LoginInput;
  const result = await authService.login(body);
  res.status(200).json(success(result, "Login realizado com sucesso."));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.me(req.user!.id);
  res.status(200).json(success(result, "Sessão carregada com sucesso."));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateMeInput;
  const result = await authService.updateMe(req.user!.id, body);
  res.status(200).json(success(result, "Perfil atualizado com sucesso."));
});
