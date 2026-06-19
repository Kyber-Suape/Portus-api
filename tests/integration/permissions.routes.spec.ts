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

describe("GET /api/permissions", () => {
  it("retorna o catálogo completo sem exigir autenticação", async () => {
    const response = await request(testApp).get("/api/permissions");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.map((p: { key: string }) => p.key)).toContain("users:create");
  });
});

describe("GET /api/roles/:role/permissions", () => {
  it("retorna os defaults do papel sem exigir autenticação", async () => {
    const response = await request(testApp).get(`/api/roles/${UserRole.AUDITOR}/permissions`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe(UserRole.AUDITOR);
    expect(response.body.data.permissionKeys).toContain("reports:export");
    expect(response.body.data.permissionKeys).not.toContain("users:create");
  });

  it("rejeita papel inexistente", async () => {
    const response = await request(testApp).get("/api/roles/NOT_A_ROLE/permissions");
    expect(response.status).toBe(400);
  });
});

describe("GET /api/users/:id/permissions", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp).get("/api/users/00000000-0000-0000-0000-000000000000/permissions");
    expect(response.status).toBe(401);
  });

  it("rejeita acesso de um perfil sem a permissão permissions:read", async () => {
    const { organization, user } = await registerAndLogin();
    const auditorToken = signToken({ id: "fake-user-id", role: UserRole.AUDITOR, organizationId: organization.id });

    const response = await request(testApp)
      .get(`/api/users/${user.id}/permissions`)
      .set("Authorization", `Bearer ${auditorToken}`);

    expect(response.status).toBe(403);
  });

  it("lista as permissões efetivas indicando a origem (role ou override)", async () => {
    // `permissionKeys` é o conjunto final desejado (não um "extra" sobre o default do papel):
    // mantemos todos os defaults do AUDITOR e adicionamos "users:read" por cima.
    const auditorDefaultsResponse = await request(testApp).get(`/api/roles/${UserRole.AUDITOR}/permissions`);
    const auditorDefaults: string[] = auditorDefaultsResponse.body.data.permissionKeys;

    const { token } = await registerAndLogin({
      invitedUsers: [
        buildInvitedUserPayload({
          role: UserRole.AUDITOR,
          permissionKeys: [...auditorDefaults, "users:read"],
        }),
      ],
    });

    const usersResponse = await request(testApp).get("/api/users").set("Authorization", `Bearer ${token}`);
    const invitedUser = usersResponse.body.data.items.find((u: { role: string }) => u.role === UserRole.AUDITOR);

    const response = await request(testApp)
      .get(`/api/users/${invitedUser.id}/permissions`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    const byKey = new Map(response.body.data.map((p: { key: string; granted: boolean; source: string }) => [p.key, p]));
    expect(byKey.get("reports:export")).toMatchObject({ granted: true, source: "role" });
    expect(byKey.get("users:read")).toMatchObject({ granted: true, source: "override" });
  });
});

describe("PATCH /api/users/:id/permissions", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp)
      .patch("/api/users/00000000-0000-0000-0000-000000000000/permissions")
      .send({ permissionKeys: [] });
    expect(response.status).toBe(401);
  });

  it("rejeita acesso de um perfil sem a permissão permissions:update", async () => {
    const { organization, user } = await registerAndLogin();
    const auditorToken = signToken({ id: "fake-user-id", role: UserRole.AUDITOR, organizationId: organization.id });

    const response = await request(testApp)
      .patch(`/api/users/${user.id}/permissions`)
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({ permissionKeys: [] });

    expect(response.status).toBe(403);
  });

  it("impede o SYSTEM_ADMIN de editar as próprias permissões", async () => {
    const { token, user } = await registerAndLogin();

    const response = await request(testApp)
      .patch(`/api/users/${user.id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ permissionKeys: [] });

    expect(response.status).toBe(403);
  });

  it("retorna 404 ao editar permissões de usuário de outra organização", async () => {
    const orgA = await registerAndLogin();
    const orgB = await registerAndLogin();

    const response = await request(testApp)
      .patch(`/api/users/${orgB.user.id}/permissions`)
      .set("Authorization", `Bearer ${orgA.token}`)
      .send({ permissionKeys: [] });

    expect(response.status).toBe(404);
  });

  it("concede e depois revoga uma permissão extra para um usuário comum", async () => {
    const { token } = await registerAndLogin({
      invitedUsers: [buildInvitedUserPayload({ role: UserRole.AUDITOR })],
    });
    const usersResponse = await request(testApp).get("/api/users").set("Authorization", `Bearer ${token}`);
    const invitedUser = usersResponse.body.data.items.find((u: { role: string }) => u.role === UserRole.AUDITOR);

    const grantResponse = await request(testApp)
      .patch(`/api/users/${invitedUser.id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ permissionKeys: ["dashboard:read", "users:create"] });

    expect(grantResponse.status).toBe(200);
    const grantedKeys = grantResponse.body.data.filter((p: { granted: boolean }) => p.granted).map((p: { key: string }) => p.key);
    expect(grantedKeys).toContain("users:create");

    const revokeResponse = await request(testApp)
      .patch(`/api/users/${invitedUser.id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ permissionKeys: [] });

    expect(revokeResponse.status).toBe(200);
    const stillGranted = revokeResponse.body.data.filter((p: { granted: boolean }) => p.granted);
    expect(stillGranted).toHaveLength(0);
  });
});
