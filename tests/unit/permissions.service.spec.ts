import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { permissionsService } from "../../src/modules/permissions/permissions.service";
import { permissionsRepository } from "../../src/modules/permissions/permissions.repository";
import { usersRepository } from "../../src/modules/users/users.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../src/shared/errors/HttpErrors";

vi.mock("../../src/config/database", () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({})),
  },
}));

vi.mock("../../src/modules/permissions/permissions.repository", () => ({
  permissionsRepository: {
    findAll: vi.fn(),
    findByKeys: vi.fn(),
    findRoleDefaults: vi.fn(),
    findUserOverrides: vi.fn(),
    upsertUserOverride: vi.fn(),
    deleteUserOverride: vi.fn(),
  },
}));

vi.mock("../../src/modules/users/users.repository", () => ({
  usersRepository: {
    findById: vi.fn(),
  },
}));

function permission(key: string, id = key) {
  const [feature, action] = key.split(":");
  return { id, key, feature, action, description: null };
}

function rolePermission(key: string) {
  return { permission: permission(key) };
}

function userOverride(key: string, granted: boolean) {
  return { permission: permission(key), granted };
}

describe("permissionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEffectiveKeys", () => {
    it("retorna os defaults do papel quando não há overrides", async () => {
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([
        rolePermission("users:read"),
        rolePermission("dashboard:read"),
      ] as never);
      vi.mocked(permissionsRepository.findUserOverrides).mockResolvedValue([]);

      const keys = await permissionsService.getEffectiveKeys("user-1", UserRole.SUAPE_INSPECTOR);

      expect(keys.sort()).toEqual(["dashboard:read", "users:read"]);
    });

    it("concede uma permissão extra via override granted=true", async () => {
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([rolePermission("dashboard:read")] as never);
      vi.mocked(permissionsRepository.findUserOverrides).mockResolvedValue([userOverride("reports:export", true)] as never);

      const keys = await permissionsService.getEffectiveKeys("user-1", UserRole.SUPPLIER);

      expect(keys.sort()).toEqual(["dashboard:read", "reports:export"]);
    });

    it("revoga uma permissão do default via override granted=false", async () => {
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([
        rolePermission("dashboard:read"),
        rolePermission("reports:read"),
      ] as never);
      vi.mocked(permissionsRepository.findUserOverrides).mockResolvedValue([userOverride("reports:read", false)] as never);

      const keys = await permissionsService.getEffectiveKeys("user-1", UserRole.AUDITOR);

      expect(keys).toEqual(["dashboard:read"]);
    });
  });

  describe("getUserPermissionsDetailed", () => {
    it("lança NotFoundError quando o usuário não pertence à organização", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue({ organizationId: "org-2" } as never);

      await expect(
        permissionsService.getUserPermissionsDetailed("org-1", "user-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("marca a origem de cada permissão como role ou override", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue({
        organizationId: "org-1",
        role: UserRole.AUDITOR,
      } as never);
      vi.mocked(permissionsRepository.findAll).mockResolvedValue([
        permission("dashboard:read"),
        permission("users:create"),
      ] as never);
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([rolePermission("dashboard:read")] as never);
      vi.mocked(permissionsRepository.findUserOverrides).mockResolvedValue([userOverride("users:create", true)] as never);

      const result = await permissionsService.getUserPermissionsDetailed("org-1", "user-1");

      expect(result).toEqual([
        { key: "dashboard:read", feature: "dashboard", action: "read", description: null, granted: true, source: "role" },
        { key: "users:create", feature: "users", action: "create", description: null, granted: true, source: "override" },
      ]);
    });
  });

  describe("applyPermissionOverrides", () => {
    it("lança BadRequestError para chaves fora do catálogo", async () => {
      vi.mocked(permissionsRepository.findAll).mockResolvedValue([permission("dashboard:read")] as never);

      await expect(
        permissionsService.applyPermissionOverrides("user-1", UserRole.AUDITOR, ["nao:existe"], {} as never),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("remove o override quando o conjunto desejado já bate com o default", async () => {
      vi.mocked(permissionsRepository.findAll).mockResolvedValue([permission("dashboard:read")] as never);
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([rolePermission("dashboard:read")] as never);

      await permissionsService.applyPermissionOverrides("user-1", UserRole.AUDITOR, ["dashboard:read"], {} as never);

      expect(permissionsRepository.deleteUserOverride).toHaveBeenCalledWith("user-1", "dashboard:read", {});
      expect(permissionsRepository.upsertUserOverride).not.toHaveBeenCalled();
    });

    it("grava um override quando o desejado difere do default", async () => {
      vi.mocked(permissionsRepository.findAll).mockResolvedValue([permission("users:create")] as never);
      vi.mocked(permissionsRepository.findRoleDefaults).mockResolvedValue([]);

      await permissionsService.applyPermissionOverrides("user-1", UserRole.AUDITOR, ["users:create"], {} as never);

      expect(permissionsRepository.upsertUserOverride).toHaveBeenCalledWith("user-1", "users:create", true, {});
    });
  });

  describe("updateUserPermissions", () => {
    it("lança ForbiddenError ao tentar editar as próprias permissões", async () => {
      await expect(
        permissionsService.updateUserPermissions("org-1", "user-1", "user-1", []),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(usersRepository.findById).not.toHaveBeenCalled();
    });

    it("lança NotFoundError quando o usuário alvo não pertence à organização", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue({ organizationId: "org-2" } as never);

      await expect(
        permissionsService.updateUserPermissions("org-1", "admin-1", "user-1", []),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
