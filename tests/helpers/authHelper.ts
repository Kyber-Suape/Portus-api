import request from "supertest";
import type { OrganizationCoreInput } from "../../src/modules/organizations/organizations.schemas";
import type { InvitedUserInput } from "../../src/modules/users/users.schemas";
import { buildOrganizationPayload } from "../factories/organizationFactory";
import { buildAdminPayload } from "../factories/userFactory";
import { testApp } from "./testApp";

interface RegisterAndLoginOptions {
  organization?: Partial<OrganizationCoreInput>;
  admin?: { name?: string; cpf?: string; email?: string; phone?: string; password?: string };
  invitedUsers?: InvitedUserInput[];
}

/** Registra uma organização + administrador via HTTP e autentica, retornando um token JWT válido para os testes de integração. */
export async function registerAndLogin(options: RegisterAndLoginOptions = {}) {
  const organization = buildOrganizationPayload(options.organization);
  const admin = buildAdminPayload(options.admin);

  const registerResponse = await request(testApp)
    .post("/api/auth/register")
    .send({ organization, admin, invitedUsers: options.invitedUsers ?? [] });

  if (registerResponse.status !== 201) {
    throw new Error(
      `Falha ao registrar usuário de teste: ${registerResponse.status} ${JSON.stringify(registerResponse.body)}`,
    );
  }

  const loginResponse = await request(testApp)
    .post("/api/auth/login")
    .send({ email: admin.email, password: admin.password });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Falha ao autenticar usuário de teste: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`,
    );
  }

  return {
    token: loginResponse.body.data.token as string,
    user: loginResponse.body.data.user,
    organization: registerResponse.body.data.organization,
    adminCredentials: admin,
  };
}
