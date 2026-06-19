import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { loginSchema, registerSchema, updateMeSchema } from "../../src/modules/auth/auth.schemas";
import {
  createUserSchema,
  invitedUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../../src/modules/users/users.schemas";
import { organizationCoreSchema, updateOrganizationSchema } from "../../src/modules/organizations/organizations.schemas";
import { buildOrganizationPayload } from "../factories/organizationFactory";
import { buildAdminPayload, buildInvitedUserPayload } from "../factories/userFactory";

describe("organizationCoreSchema", () => {
  it("aceita um payload válido", () => {
    expect(organizationCoreSchema.safeParse(buildOrganizationPayload()).success).toBe(true);
  });

  it("rejeita CNPJ com tamanho inválido", () => {
    const result = organizationCoreSchema.safeParse(buildOrganizationPayload({ cnpj: "123" }));
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail institucional inválido", () => {
    const result = organizationCoreSchema.safeParse(
      buildOrganizationPayload({ institutionalEmail: "não-é-email" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("updateOrganizationSchema", () => {
  it("rejeita objeto vazio", () => {
    expect(updateOrganizationSchema.safeParse({}).success).toBe(false);
  });

  it("aceita atualização parcial", () => {
    expect(updateOrganizationSchema.safeParse({ tradeName: "Novo nome" }).success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("aceita organização + admin sem usuários convidados", () => {
    const result = registerSchema.safeParse({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.invitedUsers).toEqual([]);
  });

  it("aceita usuários convidados válidos", () => {
    const result = registerSchema.safeParse({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
      invitedUsers: [buildInvitedUserPayload()],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita senha do admin abaixo de 8 caracteres", () => {
    const result = registerSchema.safeParse({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload({ password: "123" }),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita perfil inválido para usuário convidado", () => {
    const result = registerSchema.safeParse({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
      invitedUsers: [{ ...buildInvitedUserPayload(), role: "NOT_A_ROLE" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("aceita credenciais válidas", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "qualquer" }).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "invalido", password: "qualquer" }).success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("aceita CPF ausente (convite sem CPF)", () => {
    const result = createUserSchema.safeParse(buildInvitedUserPayload());
    expect(result.success).toBe(true);
  });

  it("rejeita CPF com formato inválido quando informado", () => {
    const result = createUserSchema.safeParse({ ...buildInvitedUserPayload(), cpf: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejeita senha e confirmação diferentes", () => {
    const result = createUserSchema.safeParse({
      ...buildInvitedUserPayload(),
      password: "Senha@12345",
      passwordConfirmation: "Outra@12345",
    });
    expect(result.success).toBe(false);
  });

  it("aceita permissionKeys customizadas", () => {
    const result = createUserSchema.safeParse({
      ...buildInvitedUserPayload(),
      permissionKeys: ["reports:export"],
    });
    expect(result.success).toBe(true);
  });
});

describe("invitedUserSchema", () => {
  it("rejeita senha abaixo de 8 caracteres", () => {
    const result = invitedUserSchema.safeParse({
      ...buildInvitedUserPayload(),
      password: "123",
      passwordConfirmation: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha e confirmação diferentes", () => {
    const result = invitedUserSchema.safeParse({
      ...buildInvitedUserPayload(),
      password: "Senha@12345",
      passwordConfirmation: "Diferente@123",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMeSchema", () => {
  it("rejeita objeto vazio", () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });

  it("aceita atualização parcial sem senha", () => {
    expect(updateMeSchema.safeParse({ name: "Novo Nome" }).success).toBe(true);
  });

  it("rejeita senha e confirmação diferentes", () => {
    const result = updateMeSchema.safeParse({
      password: "NovaSenha@123",
      passwordConfirmation: "Diferente@123",
    });
    expect(result.success).toBe(false);
  });

  it("aceita senha e confirmação iguais", () => {
    const result = updateMeSchema.safeParse({
      password: "NovaSenha@123",
      passwordConfirmation: "NovaSenha@123",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateUserSchema", () => {
  it("rejeita objeto vazio", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it("aceita atualização de status", () => {
    expect(updateUserSchema.safeParse({ status: "INACTIVE" }).success).toBe(true);
  });

  it("rejeita role inexistente", () => {
    expect(updateUserSchema.safeParse({ role: "NOT_A_ROLE" }).success).toBe(false);
  });
});

describe("listUsersQuerySchema", () => {
  it("aplica defaults de paginação", () => {
    const result = listUsersQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it("coage page/pageSize vindos da query string", () => {
    const result = listUsersQuerySchema.parse({ page: "2", pageSize: "10", role: UserRole.AUDITOR });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.role).toBe(UserRole.AUDITOR);
  });

  it("rejeita pageSize acima do limite", () => {
    expect(listUsersQuerySchema.safeParse({ pageSize: "1000" }).success).toBe(false);
  });
});
