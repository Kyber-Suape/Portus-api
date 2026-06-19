import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole, UserStatus } from "@prisma/client";
import { authService } from "../../src/modules/auth/auth.service";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository";
import { usersRepository } from "../../src/modules/users/users.repository";
import { permissionsService } from "../../src/modules/permissions/permissions.service";
import { comparePassword, hashPassword } from "../../src/shared/utils/password";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../src/shared/errors/HttpErrors";
import { buildOrganizationPayload } from "../factories/organizationFactory";
import { buildAdminPayload, buildInvitedUserPayload } from "../factories/userFactory";

vi.mock("../../src/config/database", () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({})),
  },
}));

vi.mock("../../src/modules/organizations/organizations.repository", () => ({
  organizationsRepository: { create: vi.fn(), findById: vi.fn(), findByCnpj: vi.fn(), update: vi.fn() },
}));

vi.mock("../../src/modules/users/users.repository", () => ({
  usersRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    findManyByOrganization: vi.fn(),
    countByOrganizationAndRole: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../src/modules/permissions/permissions.service", () => ({
  permissionsService: {
    getEffectiveKeys: vi.fn(async () => []),
    applyPermissionOverrides: vi.fn(),
  },
}));

vi.mock("../../src/shared/utils/password", () => ({
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
  comparePassword: vi.fn(async () => true),
}));

const organizationRecord = {
  id: "org-1",
  ...buildOrganizationPayload(),
  complement: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildUserRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    organizationId: "org-1",
    name: "Admin",
    cpf: "00000000000",
    email: "admin@teste.com",
    phone: "81999990000",
    passwordHash: "hashed:Senha@12345",
    role: UserRole.SYSTEM_ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("cria organização, admin e usuários convidados (todos ativos e com senha) numa única transação", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(null);
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(usersRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(organizationsRepository.create).mockResolvedValue(organizationRecord);
      vi.mocked(usersRepository.create)
        .mockResolvedValueOnce(buildUserRecord())
        .mockResolvedValueOnce(
          buildUserRecord({ id: "user-2", role: UserRole.AUDITOR, status: UserStatus.ACTIVE, passwordHash: "hashed:Convidado@12345" }),
        );

      const invited = buildInvitedUserPayload({ role: UserRole.AUDITOR });
      const payload = {
        organization: buildOrganizationPayload(),
        admin: buildAdminPayload(),
        invitedUsers: [invited],
      };

      const result = await authService.register(payload);

      expect(result.admin).not.toHaveProperty("passwordHash");
      expect(result.invitedUsers).toHaveLength(1);
      expect(result.invitedUsers[0]).not.toHaveProperty("passwordHash");
      expect(result.invitedUsers[0].status).toBe(UserStatus.ACTIVE);
      expect(hashPassword).toHaveBeenCalledWith(payload.admin.password);
      expect(hashPassword).toHaveBeenCalledWith(invited.password);
      expect(usersRepository.create).toHaveBeenCalledTimes(2);
      expect(usersRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ status: "ACTIVE", passwordHash: "hashed:Convidado@12345" }),
        expect.anything(),
      );
    });

    it("aplica permissionKeys customizadas de um convidado dentro da transação", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(null);
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(usersRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(organizationsRepository.create).mockResolvedValue(organizationRecord);
      const invitedRecord = buildUserRecord({ id: "user-2", role: UserRole.AUDITOR });
      vi.mocked(usersRepository.create).mockResolvedValueOnce(buildUserRecord()).mockResolvedValueOnce(invitedRecord);

      const invited = buildInvitedUserPayload({ role: UserRole.AUDITOR, permissionKeys: ["reports:export"] });

      await authService.register({
        organization: buildOrganizationPayload(),
        admin: buildAdminPayload(),
        invitedUsers: [invited],
      });

      expect(permissionsService.applyPermissionOverrides).toHaveBeenCalledWith(
        "user-2",
        UserRole.AUDITOR,
        ["reports:export"],
        expect.anything(),
      );
    });

    it("lança ConflictError quando o CNPJ já existe", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(organizationRecord);

      await expect(
        authService.register({
          organization: buildOrganizationPayload(),
          admin: buildAdminPayload(),
          invitedUsers: [],
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(organizationsRepository.create).not.toHaveBeenCalled();
    });

    it("lança ConflictError quando o e-mail do admin já existe", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(null);
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(buildUserRecord());

      await expect(
        authService.register({
          organization: buildOrganizationPayload(),
          admin: buildAdminPayload(),
          invitedUsers: [],
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("lança BadRequestError quando há e-mails duplicados entre convidados", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(null);
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(usersRepository.findByCpf).mockResolvedValue(null);

      const duplicateEmail = "duplicado@teste.com";

      await expect(
        authService.register({
          organization: buildOrganizationPayload(),
          admin: buildAdminPayload(),
          invitedUsers: [
            buildInvitedUserPayload({ email: duplicateEmail }),
            buildInvitedUserPayload({ email: duplicateEmail }),
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(organizationsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("retorna token e usuário quando as credenciais são válidas", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(buildUserRecord());
      vi.mocked(comparePassword).mockResolvedValue(true);

      const result = await authService.login({ email: "admin@teste.com", password: "Senha@12345" });

      expect(result.token).toBeTypeOf("string");
      expect(result.user).not.toHaveProperty("passwordHash");
    });

    it("lança UnauthorizedError quando o usuário não existe", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);

      await expect(
        authService.login({ email: "ninguem@teste.com", password: "qualquer" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("lança UnauthorizedError quando a senha está incorreta", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(buildUserRecord());
      vi.mocked(comparePassword).mockResolvedValue(false);

      await expect(
        authService.login({ email: "admin@teste.com", password: "errada" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("lança UnauthorizedError para usuário sem senha definida", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(
        buildUserRecord({ passwordHash: null }),
      );

      await expect(
        authService.login({ email: "semsenha@teste.com", password: "qualquer" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("me", () => {
    it("retorna usuário, organização e permissões efetivas", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUserRecord());
      vi.mocked(organizationsRepository.findById).mockResolvedValue(organizationRecord);
      vi.mocked(permissionsService.getEffectiveKeys).mockResolvedValue(["users:read", "organization:read"]);

      const result = await authService.me("user-1");

      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.organization).toEqual(organizationRecord);
      expect(result.permissions).toEqual(["users:read", "organization:read"]);
    });

    it("lança NotFoundError quando o usuário não existe", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(null);

      await expect(authService.me("user-x")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateMe", () => {
    it("atualiza dados básicos sem alterar a senha quando não enviada", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUserRecord());
      vi.mocked(usersRepository.update).mockResolvedValue(buildUserRecord({ name: "Novo Nome" }));

      const result = await authService.updateMe("user-1", { name: "Novo Nome" });

      expect(result.name).toBe("Novo Nome");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(usersRepository.update).toHaveBeenCalledWith(
        "user-1",
        expect.not.objectContaining({ passwordHash: expect.anything() }),
      );
    });

    it("atualiza a senha (com hash) quando enviada", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUserRecord());
      vi.mocked(usersRepository.update).mockResolvedValue(buildUserRecord());

      await authService.updateMe("user-1", { password: "NovaSenha@123", passwordConfirmation: "NovaSenha@123" });

      expect(hashPassword).toHaveBeenCalledWith("NovaSenha@123");
      expect(usersRepository.update).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ passwordHash: "hashed:NovaSenha@123" }),
      );
    });

    it("lança ConflictError quando o novo e-mail já está em uso por outro usuário", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUserRecord());
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(buildUserRecord({ id: "outro-user" }));

      await expect(
        authService.updateMe("user-1", { email: "outro@teste.com" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("lança NotFoundError quando o usuário não existe", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(null);

      await expect(authService.updateMe("user-x", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
