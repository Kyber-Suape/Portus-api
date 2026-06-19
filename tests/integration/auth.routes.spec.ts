import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { buildOrganizationPayload } from "../factories/organizationFactory";
import { buildAdminPayload, buildInvitedUserPayload } from "../factories/userFactory";
import { disconnectDatabase, resetDatabase } from "../helpers/databaseTestHelper";
import { testApp } from "../helpers/testApp";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await disconnectDatabase();
});

describe("POST /api/auth/register", () => {
  it("cadastra organização, administrador e usuários convidados já ativos e com senha", async () => {
    const payload = {
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
      invitedUsers: [buildInvitedUserPayload(), buildInvitedUserPayload()],
    };

    const response = await request(testApp).post("/api/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.organization.cnpj).toBe(payload.organization.cnpj);
    expect(response.body.data.admin.email).toBe(payload.admin.email);
    expect(response.body.data.admin).not.toHaveProperty("passwordHash");
    expect(response.body.data.invitedUsers).toHaveLength(2);
    response.body.data.invitedUsers.forEach((user: Record<string, unknown>) => {
      expect(user).not.toHaveProperty("passwordHash");
      expect(user.status).toBe("ACTIVE");
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("rejeita registro quando senha e confirmação de um convidado são diferentes", async () => {
    const response = await request(testApp).post("/api/auth/register").send({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
      invitedUsers: [
        buildInvitedUserPayload({ password: "Senha@12345", passwordConfirmation: "Diferente@123" }),
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejeita CNPJ duplicado", async () => {
    const organization = buildOrganizationPayload();
    await request(testApp).post("/api/auth/register").send({ organization, admin: buildAdminPayload() });

    const response = await request(testApp)
      .post("/api/auth/register")
      .send({ organization, admin: buildAdminPayload() });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("rejeita e-mail de administrador duplicado", async () => {
    const admin = buildAdminPayload();
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin });

    const response = await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin });

    expect(response.status).toBe(409);
  });

  it("rejeita CPF de administrador duplicado", async () => {
    const cpf = "98765432100";
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin: buildAdminPayload({ cpf }) });

    const response = await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin: buildAdminPayload({ cpf }) });

    expect(response.status).toBe(409);
  });

  it("rejeita senha do administrador muito curta", async () => {
    const response = await request(testApp).post("/api/auth/register").send({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload({ password: "123" }),
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeInstanceOf(Array);
  });

  it("rejeita payload sem o campo organization", async () => {
    const response = await request(testApp)
      .post("/api/auth/register")
      .send({ admin: buildAdminPayload() });

    expect(response.status).toBe(400);
  });

  it("não persiste nada se uma parte do cadastro falhar dentro da transação", async () => {
    const admin = buildAdminPayload();
    const organization = buildOrganizationPayload();

    // E-mail do convidado igual ao do admin: passa pelas pré-checagens (nenhum dos dois
    // ainda existe no banco) mas colide com a constraint única do banco na hora de
    // persistir o segundo usuário, estourando dentro da transação.
    const response = await request(testApp).post("/api/auth/register").send({
      organization,
      admin,
      invitedUsers: [buildInvitedUserPayload({ email: admin.email })],
    });

    expect(response.status).toBe(409);

    const persistedOrganization = await prisma.organization.findUnique({
      where: { cnpj: organization.cnpj },
    });
    const persistedAdmin = await prisma.user.findUnique({ where: { email: admin.email } });

    expect(persistedOrganization).toBeNull();
    expect(persistedAdmin).toBeNull();
  });
});

describe("POST /api/auth/login", () => {
  it("autentica o administrador e retorna um token", async () => {
    const admin = buildAdminPayload();
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: admin.email, password: admin.password });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTypeOf("string");
    expect(response.body.data.user.email).toBe(admin.email);
  });

  it("autentica um usuário convidado com a senha definida no cadastro", async () => {
    const invited = buildInvitedUserPayload();
    await request(testApp).post("/api/auth/register").send({
      organization: buildOrganizationPayload(),
      admin: buildAdminPayload(),
      invitedUsers: [invited],
    });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: invited.email, password: invited.password });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTypeOf("string");
    expect(response.body.data.user.email).toBe(invited.email);
  });

  it("rejeita senha incorreta", async () => {
    const admin = buildAdminPayload();
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "senha-errada" });

    expect(response.status).toBe(401);
  });

  it("rejeita e-mail inexistente", async () => {
    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: "ninguem@teste.com", password: "qualquer" });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("rejeita token malformado", async () => {
    const response = await request(testApp).get("/api/auth/me").set("Authorization", "Bearer token-invalido");
    expect(response.status).toBe(401);
  });

  it("retorna o usuário, a organização e as permissões efetivas do autenticado", async () => {
    const admin = buildAdminPayload();
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin });

    const loginResponse = await request(testApp)
      .post("/api/auth/login")
      .send({ email: admin.email, password: admin.password });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(admin.email);
    expect(response.body.data.organization).toBeTruthy();
    expect(response.body.data.permissions).toContain("users:create");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });
});

describe("PATCH /api/auth/me", () => {
  it("rejeita acesso sem token", async () => {
    const response = await request(testApp).patch("/api/auth/me").send({ name: "Novo Nome" });
    expect(response.status).toBe(401);
  });

  it("rejeita corpo vazio", async () => {
    const admin = buildAdminPayload();
    await request(testApp).post("/api/auth/register").send({ organization: buildOrganizationPayload(), admin });
    const login = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });

    const response = await request(testApp)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("atualiza nome/telefone sem alterar a senha", async () => {
    const admin = buildAdminPayload();
    await request(testApp).post("/api/auth/register").send({ organization: buildOrganizationPayload(), admin });
    const login = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });

    const response = await request(testApp)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ name: "Nome Atualizado", phone: "81977776666" });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Nome Atualizado");
    expect(response.body.data).not.toHaveProperty("passwordHash");

    const stillWorks = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });
    expect(stillWorks.status).toBe(200);
  });

  it("atualiza a senha e passa a exigir a nova senha no login", async () => {
    const admin = buildAdminPayload();
    await request(testApp).post("/api/auth/register").send({ organization: buildOrganizationPayload(), admin });
    const login = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });

    const update = await request(testApp)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ password: "NovaSenha@123", passwordConfirmation: "NovaSenha@123" });

    expect(update.status).toBe(200);

    const oldPasswordLogin = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(testApp)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "NovaSenha@123" });
    expect(newPasswordLogin.status).toBe(200);
  });

  it("rejeita e-mail já usado por outro usuário da organização", async () => {
    const admin = buildAdminPayload();
    const invited = buildInvitedUserPayload();
    await request(testApp)
      .post("/api/auth/register")
      .send({ organization: buildOrganizationPayload(), admin, invitedUsers: [invited] });
    const login = await request(testApp).post("/api/auth/login").send({ email: admin.email, password: admin.password });

    const response = await request(testApp)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ email: invited.email });

    expect(response.status).toBe(409);
  });
});
