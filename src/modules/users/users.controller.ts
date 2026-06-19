import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { success } from "../../shared/utils/apiResponse";
import { usersService } from "./users.service";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schemas";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery;
  const result = await usersService.listUsers(req.user!.organizationId, query);
  res.status(200).json(success(result, "Usuários listados com sucesso."));
});

export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateUserInput;
  const user = await usersService.inviteUser(req.user!.organizationId, body);
  res.status(201).json(success(user, "Usuário convidado com sucesso."));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateUserInput;
  const user = await usersService.updateUser(req.user!.organizationId, req.params.id, body);
  res.status(200).json(success(user, "Usuário atualizado com sucesso."));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteUser(req.user!.organizationId, req.params.id, req.user!.id);
  res.status(200).json(success(null, "Usuário removido com sucesso."));
});
