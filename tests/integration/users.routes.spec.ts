import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { signToken } from "../../src/shared/utils/jwt";
import { buildInvitedUserPayload } from "../factories/userFactory";
import { disconnectDatabase, resetDatabase } from "../helpers/databaseTestHelper";
import { registerAndLogin } from "../helpers/authHelper";
import { testApp } from "../helpers/testApp";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await disconnectDatabase();
});

describe("GET /api/users", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp).get("/api/users");
    expect(response.status).toBe(401);
  });

  it("rejeita acesso de um perfil sem a permissão users:read", async () => {
    const { organization } = await registerAndLogin({
      invitedUsers: [buildInvitedUserPayload({ role: UserRole.AUDITOR })],
    });

    const auditorToken = await signTokenFor(UserRole.AUDITOR, organization.id);

    const response = await request(testApp)
      .get("/api/users")
      .set("Authorization", `Bearer ${auditorToken}`);

    expect(response.status).toBe(403);
  });

  it("lista os usuários da organização com paginação", async () => {
    const { token } = await registerAndLogin({
      invitedUsers: [buildInvitedUserPayload(), buildInvitedUserPayload()],
    });

    const response = await request(testApp)
      .get("/api/users")
      .query({ page: 1, pageSize: 1 })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.meta).toMatchObject({ page: 1, pageSize: 1, total: 3 });
  });

  it("filtra por role e por busca textual", async () => {
    const auditor = buildInvitedUserPayload({ role: UserRole.AUDITOR, name: "Carlos Auditor" });
    const { token } = await registerAndLogin({ invitedUsers: [auditor] });

    const byRole = await request(testApp)
      .get("/api/users")
      .query({ role: UserRole.AUDITOR })
      .set("Authorization", `Bearer ${token}`);
    expect(byRole.body.data.items.every((u: { role: string }) => u.role === UserRole.AUDITOR)).toBe(true);

    const byQuery = await request(testApp)
      .get("/api/users")
      .query({ q: "Carlos" })
      .set("Authorization", `Bearer ${token}`);
    expect(byQuery.body.data.items).toHaveLength(1);
    expect(byQuery.body.data.items[0].email).toBe(auditor.email);
  });
});

describe("POST /api/users", () => {
  it("cria um novo usuário já ativo, com senha", async () => {
    const { token } = await registerAndLogin();
    const payload = buildInvitedUserPayload();

    const response = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data).not.toHaveProperty("passwordHash");

    const loginResponse = await request(testApp)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(loginResponse.status).toBe(200);
  });

  it("rejeita criação sem senha", async () => {
    const { token } = await registerAndLogin();
    const { password: _password, passwordConfirmation: _passwordConfirmation, ...rest } = buildInvitedUserPayload();

    const response = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(rest);

    expect(response.status).toBe(400);
  });

  it("rejeita e-mail já cadastrado", async () => {
    const { token, adminCredentials } = await registerAndLogin();

    const response = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(buildInvitedUserPayload({ email: adminCredentials.email }));

    expect(response.status).toBe(409);
  });

  it("rejeita acesso de um perfil sem a permissão users:create", async () => {
    const { organization } = await registerAndLogin();
    const auditorToken = await signTokenFor(UserRole.AUDITOR, organization.id);

    const response = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send(buildInvitedUserPayload());

    expect(response.status).toBe(403);
  });

  it("aplica permissionKeys customizadas ao usuário criado", async () => {
    const { token } = await registerAndLogin();

    const createResponse = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(buildInvitedUserPayload({ role: UserRole.AUDITOR, permissionKeys: ["reports:export", "users:read"] }));

    expect(createResponse.status).toBe(201);

    const permissionsResponse = await request(testApp)
      .get(`/api/users/${createResponse.body.data.id}/permissions`)
      .set("Authorization", `Bearer ${token}`);

    expect(permissionsResponse.status).toBe(200);
    const grantedKeys = permissionsResponse.body.data
      .filter((p: { granted: boolean }) => p.granted)
      .map((p: { key: string }) => p.key);
    expect(grantedKeys).toContain("reports:export");
    expect(grantedKeys).toContain("users:read");
  });
});

describe("PATCH /api/users/:id", () => {
  it("atualiza um usuário da própria organização", async () => {
    const { token } = await registerAndLogin();
    const inviteResponse = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(buildInvitedUserPayload());

    const response = await request(testApp)
      .patch(`/api/users/${inviteResponse.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "INACTIVE" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("INACTIVE");
  });

  it("retorna 404 ao tentar atualizar usuário de outra organização", async () => {
    const orgA = await registerAndLogin();
    const orgB = await registerAndLogin();

    const response = await request(testApp)
      .patch(`/api/users/${orgB.user.id}`)
      .set("Authorization", `Bearer ${orgA.token}`)
      .send({ name: "Tentativa indevida" });

    expect(response.status).toBe(404);
  });

  it("impede rebaixar o último SYSTEM_ADMIN", async () => {
    const { token, user } = await registerAndLogin();

    const response = await request(testApp)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: UserRole.AUDITOR });

    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/users/:id", () => {
  it("remove um usuário convidado", async () => {
    const { token } = await registerAndLogin();
    const inviteResponse = await request(testApp)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(buildInvitedUserPayload());

    const response = await request(testApp)
      .delete(`/api/users/${inviteResponse.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("impede a autoexclusão", async () => {
    const { token, user } = await registerAndLogin();

    const response = await request(testApp)
      .delete(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});

/** Assina diretamente um token para um papel/organização, para testar `requirePermission` sem depender de um usuário real no banco. */
async function signTokenFor(role: UserRole, organizationId: string): Promise<string> {
  return signToken({ id: "fake-user-id", role, organizationId });
}
