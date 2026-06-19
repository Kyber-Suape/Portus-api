import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const PASSWORD_FIELDS = {
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  passwordConfirmation: z.string().min(1, "Confirme a senha."),
};

export const invitedUserSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do usuário."),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
    phone: z.string().trim().min(8, "Informe um telefone válido."),
    role: z.nativeEnum(UserRole, { message: "Selecione um perfil válido." }),
    permissionKeys: z.array(z.string().min(1)).optional(),
    ...PASSWORD_FIELDS,
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do usuário."),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
    phone: z.string().trim().min(8, "Informe um telefone válido."),
    role: z.nativeEnum(UserRole, { message: "Selecione um perfil válido." }),
    cpf: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "CPF deve conter 11 dígitos.")
      .optional(),
    permissionKeys: z.array(z.string().min(1)).optional(),
    ...PASSWORD_FIELDS,
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().min(8).optional(),
    cpf: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "CPF deve conter 11 dígitos.")
      .optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  q: z.string().trim().min(1).optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid("Identificador inválido."),
});

export type InvitedUserInput = z.infer<typeof invitedUserSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
