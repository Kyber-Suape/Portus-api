import { z } from "zod";
import { organizationCoreSchema } from "../organizations/organizations.schemas";
import { invitedUserSchema } from "../users/users.schemas";

export const registerAdminSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  cpf: z.string().trim().regex(/^\d{11}$/, "CPF deve conter 11 dígitos."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export const registerSchema = z.object({
  organization: organizationCoreSchema,
  admin: registerAdminSchema,
  invitedUsers: z.array(invitedUserSchema).default([]),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome completo.").optional(),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").optional(),
    phone: z.string().trim().min(8, "Informe um telefone válido.").optional(),
    cpf: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "CPF deve conter 11 dígitos.")
      .optional(),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").optional(),
    passwordConfirmation: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  })
  .refine((data) => !data.password || data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
