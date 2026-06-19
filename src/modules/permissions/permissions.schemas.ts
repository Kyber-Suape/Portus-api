import { UserRole } from "@prisma/client";
import { z } from "zod";

export const roleParamsSchema = z.object({
  role: z.nativeEnum(UserRole, { message: "Perfil inválido." }),
});

export const updateUserPermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).default([]),
});

export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;
