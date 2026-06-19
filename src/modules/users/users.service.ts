import { UserRole } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors/HttpErrors";
import { hashPassword } from "../../shared/utils/password";
import type { PaginatedData } from "../../shared/types/api";
import { permissionsService } from "../permissions/permissions.service";
import { toSafeUser, type SafeUser } from "./user.mapper";
import { usersRepository, type UserListFilters } from "./users.repository";
import type { CreateUserInput, UpdateUserInput } from "./users.schemas";

async function ensureEmailAndCpfAreFree(email: string, cpf: string | undefined, ignoreUserId?: string) {
  const existingByEmail = await usersRepository.findByEmail(email);
  if (existingByEmail && existingByEmail.id !== ignoreUserId) {
    throw new ConflictError("Este e-mail já está em uso.");
  }

  if (cpf) {
    const existingByCpf = await usersRepository.findByCpf(cpf);
    if (existingByCpf && existingByCpf.id !== ignoreUserId) {
      throw new ConflictError("Este CPF já está cadastrado.");
    }
  }
}

async function findOwnedUserOrThrow(organizationId: string, userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user || user.organizationId !== organizationId) {
    throw new NotFoundError("Usuário não encontrado nesta organização.");
  }
  return user;
}

async function listUsers(
  organizationId: string,
  filters: UserListFilters,
): Promise<PaginatedData<SafeUser>> {
  const { items, total } = await usersRepository.findManyByOrganization(organizationId, filters);

  return {
    items: items.map(toSafeUser),
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
}

async function inviteUser(organizationId: string, input: CreateUserInput): Promise<SafeUser> {
  await ensureEmailAndCpfAreFree(input.email, input.cpf);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await usersRepository.create(
      {
        name: input.name,
        email: input.email,
        phone: input.phone,
        cpf: input.cpf,
        passwordHash,
        role: input.role,
        status: "ACTIVE",
        organization: { connect: { id: organizationId } },
      },
      tx,
    );

    if (input.permissionKeys) {
      await permissionsService.applyPermissionOverrides(created.id, created.role, input.permissionKeys, tx);
    }

    return created;
  });

  return toSafeUser(user);
}

async function updateUser(
  organizationId: string,
  userId: string,
  input: UpdateUserInput,
): Promise<SafeUser> {
  const current = await findOwnedUserOrThrow(organizationId, userId);

  if (input.email || input.cpf) {
    await ensureEmailAndCpfAreFree(input.email ?? current.email, input.cpf, userId);
  }

  if (current.role === UserRole.SYSTEM_ADMIN && input.role && input.role !== UserRole.SYSTEM_ADMIN) {
    await ensureNotLastSystemAdmin(organizationId);
  }

  const updated = await usersRepository.update(userId, input);
  return toSafeUser(updated);
}

async function ensureNotLastSystemAdmin(organizationId: string) {
  const adminCount = await usersRepository.countByOrganizationAndRole(organizationId, UserRole.SYSTEM_ADMIN);
  if (adminCount <= 1) {
    throw new ForbiddenError(
      "Não é possível remover o único Administrador do Sistema da organização.",
    );
  }
}

async function deleteUser(organizationId: string, userId: string, requesterId: string): Promise<void> {
  const target = await findOwnedUserOrThrow(organizationId, userId);

  if (target.id === requesterId) {
    throw new ForbiddenError("Você não pode remover seu próprio usuário.");
  }

  if (target.role === UserRole.SYSTEM_ADMIN) {
    await ensureNotLastSystemAdmin(organizationId);
  }

  await usersRepository.remove(userId);
}

export const usersService = {
  listUsers,
  inviteUser,
  updateUser,
  deleteUser,
};
