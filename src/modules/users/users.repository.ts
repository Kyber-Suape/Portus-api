import { Prisma, PrismaClient, User, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../config/database";

type DbClient = Prisma.TransactionClient | PrismaClient;

export interface UserListFilters {
  page: number;
  pageSize: number;
  role?: UserRole;
  status?: UserStatus;
  q?: string;
}

function create(data: Prisma.UserCreateInput, client: DbClient = prisma): Promise<User> {
  return client.user.create({ data });
}

function findById(id: string, client: DbClient = prisma): Promise<User | null> {
  return client.user.findUnique({ where: { id } });
}

function findByEmail(email: string, client: DbClient = prisma): Promise<User | null> {
  return client.user.findUnique({ where: { email } });
}

function findByCpf(cpf: string, client: DbClient = prisma): Promise<User | null> {
  return client.user.findUnique({ where: { cpf } });
}

async function findManyByOrganization(
  organizationId: string,
  filters: UserListFilters,
  client: DbClient = prisma,
): Promise<{ items: User[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    organizationId,
    role: filters.role,
    status: filters.status,
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    client.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    client.user.count({ where }),
  ]);

  return { items, total };
}

function countByOrganizationAndRole(
  organizationId: string,
  role: UserRole,
  client: DbClient = prisma,
): Promise<number> {
  return client.user.count({ where: { organizationId, role } });
}

function update(id: string, data: Prisma.UserUpdateInput, client: DbClient = prisma): Promise<User> {
  return client.user.update({ where: { id }, data });
}

function remove(id: string, client: DbClient = prisma): Promise<User> {
  return client.user.delete({ where: { id } });
}

export const usersRepository = {
  create,
  findById,
  findByEmail,
  findByCpf,
  findManyByOrganization,
  countByOrganizationAndRole,
  update,
  remove,
};
