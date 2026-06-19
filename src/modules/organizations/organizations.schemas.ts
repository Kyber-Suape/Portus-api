import { OrganizationType } from "@prisma/client";
import { z } from "zod";

const cnpjRegex = /^\d{14}$/;
const cpfRegex = /^\d{11}$/;

/** Campos próprios da organização — reaproveitado pelo módulo de auth no payload de registro. */
export const organizationCoreSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da organização."),
  legalName: z.string().trim().min(2, "Informe a razão social."),
  tradeName: z.string().trim().min(2, "Informe o nome fantasia."),
  cnpj: z.string().trim().regex(cnpjRegex, "CNPJ deve conter 14 dígitos."),
  organizationType: z.nativeEnum(OrganizationType, { message: "Selecione um tipo de organização válido." }),

  institutionalEmail: z.string().trim().toLowerCase().email("Informe um e-mail institucional válido."),
  institutionalPhone: z.string().trim().min(8, "Informe um telefone institucional válido."),

  cep: z.string().trim().regex(/^\d{8}$/, "CEP deve conter 8 dígitos."),
  state: z.string().trim().length(2, "Use a sigla do estado (UF)."),
  city: z.string().trim().min(2, "Informe a cidade."),
  district: z.string().trim().min(1, "Informe o bairro."),
  street: z.string().trim().min(1, "Informe o logradouro."),
  number: z.string().trim().min(1, "Informe o número."),
  complement: z.string().trim().optional(),

  legalResponsibleName: z.string().trim().min(2, "Informe o responsável legal."),
  legalResponsibleCpf: z.string().trim().regex(cpfRegex, "CPF do responsável deve conter 11 dígitos."),
  legalResponsibleEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido para o responsável legal."),
  legalResponsiblePhone: z.string().trim().min(8, "Informe um telefone válido para o responsável legal."),

  notes: z.string().trim().optional(),
});

export const updateOrganizationSchema = organizationCoreSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export type OrganizationCoreInput = z.infer<typeof organizationCoreSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
