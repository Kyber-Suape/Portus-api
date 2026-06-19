import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/database";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/HttpErrors";
import { usersRepository } from "../users/users.repository";
import { permissionsRepository } from "./permissions.repository";

export interface PermissionSummary {
  key: string;
  feature: string;
  action: string;
  description: string | null;
}

export interface UserPermissionDetail extends PermissionSummary {
  granted: boolean;
  source: "role" | "override";
}

async function getCatalog(): Promise<PermissionSummary[]> {
  const permissions = await permissionsRepository.findAll();
  return permissions.map(({ key, feature, action, description }) => ({ key, feature, action, description }));
}

async function getRoleDefaultKeys(role: UserRole): Promise<string[]> {
  const rolePermissions = await permissionsRepository.findRoleDefaults(role);
  return rolePermissions.map((rp) => rp.permission.key);
}

/** Conjunto efetivo de permissões: defaults do papel, com overrides de concessão/revogação aplicados. */
async function getEffectiveKeys(userId: string, role: UserRole): Promise<string[]> {
  const defaultKeys = new Set(await getRoleDefaultKeys(role));
  const overrides = await permissionsRepository.findUserOverrides(userId);

  for (const override of overrides) {
    if (override.granted) defaultKeys.add(override.permission.key);
    else defaultKeys.delete(override.permission.key);
  }

  return Array.from(defaultKeys);
}

async function findOwnedUserOrThrow(organizationId: string, userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user || user.organizationId !== organizationId) {
    throw new NotFoundError("Usuário não encontrado nesta organização.");
  }
  return user;
}

async function getUserPermissionsDetailed(
  organizationId: string,
  targetUserId: string,
): Promise<UserPermissionDetail[]> {
  const targetUser = await findOwnedUserOrThrow(organizationId, targetUserId);

  const [catalog, defaultKeys, overrides] = await Promise.all([
    permissionsRepository.findAll(),
    getRoleDefaultKeys(targetUser.role),
    permissionsRepository.findUserOverrides(targetUserId),
  ]);

  const defaultKeySet = new Set(defaultKeys);
  const overrideByKey = new Map(overrides.map((o) => [o.permission.key, o.granted]));

  return catalog.map((permission) => {
    const override = overrideByKey.get(permission.key);
    const granted = override ?? defaultKeySet.has(permission.key);
    return {
      key: permission.key,
      feature: permission.feature,
      action: permission.action,
      description: permission.description,
      granted,
      source: override === undefined ? "role" : "override",
    };
  });
}

/**
 * Reconcilia o conjunto de permissões desejado para um usuário contra o default do
 * papel, gravando apenas a diferença como overrides. Não abre transação própria —
 * para ser reaproveitada dentro da transação de `auth.service.register`.
 */
async function applyPermissionOverrides(
  userId: string,
  role: UserRole,
  desiredKeys: string[],
  client: Prisma.TransactionClient,
): Promise<void> {
  const catalog = await permissionsRepository.findAll(client);
  const catalogKeys = new Set(catalog.map((p) => p.key));

  const unknownKeys = desiredKeys.filter((key) => !catalogKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new BadRequestError(`Permissões inválidas: ${unknownKeys.join(", ")}`);
  }

  const defaultKeys = new Set((await permissionsRepository.findRoleDefaults(role, client)).map((rp) => rp.permission.key));
  const desired = new Set(desiredKeys);

  for (const permission of catalog) {
    const isDefault = defaultKeys.has(permission.key);
    const isDesired = desired.has(permission.key);

    if (isDefault === isDesired) {
      await permissionsRepository.deleteUserOverride(userId, permission.id, client);
    } else {
      await permissionsRepository.upsertUserOverride(userId, permission.id, isDesired, client);
    }
  }
}

async function updateUserPermissions(
  organizationId: string,
  requesterId: string,
  targetUserId: string,
  desiredKeys: string[],
): Promise<UserPermissionDetail[]> {
  if (requesterId === targetUserId) {
    throw new ForbiddenError("Você não pode editar suas próprias permissões.");
  }

  const targetUser = await findOwnedUserOrThrow(organizationId, targetUserId);

  await prisma.$transaction((tx) => applyPermissionOverrides(targetUserId, targetUser.role, desiredKeys, tx));

  return getUserPermissionsDetailed(organizationId, targetUserId);
}

export const permissionsService = {
  getCatalog,
  getRoleDefaultKeys,
  getEffectiveKeys,
  getUserPermissionsDetailed,
  applyPermissionOverrides,
  updateUserPermissions,
};
