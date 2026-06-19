import { Permission, Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "../../config/database";

type DbClient = Prisma.TransactionClient | PrismaClient;

function findAll(client: DbClient = prisma): Promise<Permission[]> {
  return client.permission.findMany({ orderBy: [{ feature: "asc" }, { action: "asc" }] });
}

function findByKeys(keys: string[], client: DbClient = prisma): Promise<Permission[]> {
  return client.permission.findMany({ where: { key: { in: keys } } });
}

function findRoleDefaults(role: UserRole, client: DbClient = prisma) {
  return client.rolePermission.findMany({
    where: { role },
    include: { permission: true },
  });
}

function findUserOverrides(userId: string, client: DbClient = prisma) {
  return client.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });
}

function upsertUserOverride(
  userId: string,
  permissionId: string,
  granted: boolean,
  client: DbClient = prisma,
) {
  return client.userPermission.upsert({
    where: { userId_permissionId: { userId, permissionId } },
    update: { granted },
    create: { userId, permissionId, granted },
  });
}

function deleteUserOverride(userId: string, permissionId: string, client: DbClient = prisma) {
  return client.userPermission.deleteMany({ where: { userId, permissionId } });
}

export const permissionsRepository = {
  findAll,
  findByKeys,
  findRoleDefaults,
  findUserOverrides,
  upsertUserOverride,
  deleteUserOverride,
};
