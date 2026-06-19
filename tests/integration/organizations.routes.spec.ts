import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { signToken } from "../../src/shared/utils/jwt";
import { registerAndLogin } from "../helpers/authHelper";
import { disconnectDatabase, resetDatabase } from "../helpers/databaseTestHelper";
import { testApp } from "../helpers/testApp";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await disconnectDatabase();
});

describe("GET /api/organizations/me", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp).get("/api/organizations/me");
    expect(response.status).toBe(401);
  });

  it("retorna a organização do usuário autenticado", async () => {
    const { token, organization } = await registerAndLogin();

    const response = await request(testApp)
      .get("/api/organizations/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.cnpj).toBe(organization.cnpj);
  });
});

describe("PATCH /api/organizations/me", () => {
  it("rejeita perfil sem permissão", async () => {
    const { organization } = await registerAndLogin();
    const auditorToken = signToken({
      id: "fake-user-id",
      role: UserRole.AUDITOR,
      organizationId: organization.id,
    });

    const response = await request(testApp)
      .patch("/api/organizations/me")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({ tradeName: "Novo nome" });

    expect(response.status).toBe(403);
  });

  it("atualiza campos da organização", async () => {
    const { token } = await registerAndLogin();

    const response = await request(testApp)
      .patch("/api/organizations/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ tradeName: "Novo Nome Fantasia" });

    expect(response.status).toBe(200);
    expect(response.body.data.tradeName).toBe("Novo Nome Fantasia");
  });

  it("rejeita corpo vazio", async () => {
    const { token } = await registerAndLogin();

    const response = await request(testApp)
      .patch("/api/organizations/me")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("rejeita CNPJ já usado por outra organização", async () => {
    const orgA = await registerAndLogin();
    const orgB = await registerAndLogin();

    const response = await request(testApp)
      .patch("/api/organizations/me")
      .set("Authorization", `Bearer ${orgA.token}`)
      .send({ cnpj: orgB.organization.cnpj });

    expect(response.status).toBe(409);
  });
});
