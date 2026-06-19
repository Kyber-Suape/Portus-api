import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole, UserStatus } from "@prisma/client";
import { usersService } from "../../src/modules/users/users.service";
import { usersRepository } from "../../src/modules/users/users.repository";
import { permissionsService } from "../../src/modules/permissions/permissions.service";
import { ConflictError, ForbiddenError, NotFoundError } from "../../src/shared/errors/HttpErrors";
import { hashPassword } from "../../src/shared/utils/password";

vi.mock("../../src/config/database", () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({})),
  },
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
    applyPermissionOverrides: vi.fn(),
  },
}));

vi.mock("../../src/shared/utils/password", () => ({
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
  comparePassword: vi.fn(async () => true),
}));

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    organizationId: "org-1",
    name: "Usuário",
    cpf: "11111111111",
    email: "user@teste.com",
    phone: "81999990000",
    passwordHash: "hash",
    role: UserRole.SUAPE_INSPECTOR,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("retorna usuários sem passwordHash e metadados de paginação", async () => {
      vi.mocked(usersRepository.findManyByOrganization).mockResolvedValue({
        items: [buildUser()],
        total: 1,
      });

      const result = await usersService.listUsers("org-1", { page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty("passwordHash");
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    });
  });

  describe("inviteUser", () => {
    it("cria um usuário ativo com senha quando e-mail/CPF estão livres", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(usersRepository.create).mockResolvedValue(buildUser({ status: UserStatus.ACTIVE }));

      const result = await usersService.inviteUser("org-1", {
        name: "Novo",
        email: "novo@teste.com",
        phone: "81999990000",
        role: UserRole.AUDITOR,
        password: "Senha@12345",
        passwordConfirmation: "Senha@12345",
      });

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result).not.toHaveProperty("passwordHash");
      expect(hashPassword).toHaveBeenCalledWith("Senha@12345");
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ACTIVE", passwordHash: "hashed:Senha@12345" }),
        expect.anything(),
      );
    });

    it("aplica permissionKeys customizadas quando informadas", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      const created = buildUser({ id: "user-9", role: UserRole.AUDITOR });
      vi.mocked(usersRepository.create).mockResolvedValue(created);

      await usersService.inviteUser("org-1", {
        name: "Novo",
        email: "novo@teste.com",
        phone: "81999990000",
        role: UserRole.AUDITOR,
        password: "Senha@12345",
        passwordConfirmation: "Senha@12345",
        permissionKeys: ["reports:export"],
      });

      expect(permissionsService.applyPermissionOverrides).toHaveBeenCalledWith(
        "user-9",
        UserRole.AUDITOR,
        ["reports:export"],
        expect.anything(),
      );
    });

    it("lança ConflictError quando o e-mail já existe", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(buildUser());

      await expect(
        usersService.inviteUser("org-1", {
          name: "Novo",
          email: "user@teste.com",
          phone: "81999990000",
          role: UserRole.AUDITOR,
          password: "Senha@12345",
          passwordConfirmation: "Senha@12345",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("lança ConflictError quando o CPF já existe", async () => {
      vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(usersRepository.findByCpf).mockResolvedValue(buildUser());

      await expect(
        usersService.inviteUser("org-1", {
          name: "Novo",
          email: "novo@teste.com",
          phone: "81999990000",
          role: UserRole.AUDITOR,
          cpf: "11111111111",
          password: "Senha@12345",
          passwordConfirmation: "Senha@12345",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("updateUser", () => {
    it("lança NotFoundError quando o usuário não pertence à organização", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUser({ organizationId: "org-2" }));

      await expect(usersService.updateUser("org-1", "user-1", { name: "X" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("lança ForbiddenError ao tentar rebaixar o único SYSTEM_ADMIN", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUser({ role: UserRole.SYSTEM_ADMIN }));
      vi.mocked(usersRepository.countByOrganizationAndRole).mockResolvedValue(1);

      await expect(
        usersService.updateUser("org-1", "user-1", { role: UserRole.AUDITOR }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(usersRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("lança ForbiddenError ao tentar remover o próprio usuário", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUser());

      await expect(usersService.deleteUser("org-1", "user-1", "user-1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("lança ForbiddenError ao tentar remover o último SYSTEM_ADMIN", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(
        buildUser({ id: "admin-1", role: UserRole.SYSTEM_ADMIN }),
      );
      vi.mocked(usersRepository.countByOrganizationAndRole).mockResolvedValue(1);

      await expect(usersService.deleteUser("org-1", "admin-1", "requester-1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(usersRepository.remove).not.toHaveBeenCalled();
    });

    it("remove normalmente quando não é autoexclusão nem último admin", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(buildUser({ id: "user-2" }));
      vi.mocked(usersRepository.remove).mockResolvedValue(buildUser({ id: "user-2" }));

      await usersService.deleteUser("org-1", "user-2", "requester-1");

      expect(usersRepository.remove).toHaveBeenCalledWith("user-2");
    });
  });
});
