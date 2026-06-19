import { Organization, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../config/database";

type DbClient = Prisma.TransactionClient | PrismaClient;

function create(data: Prisma.OrganizationCreateInput, client: DbClient = prisma): Promise<Organization> {
  return client.organization.create({ data });
}

function findById(id: string, client: DbClient = prisma): Promise<Organization | null> {
  return client.organization.findUnique({ where: { id } });
}

function findByCnpj(cnpj: string, client: DbClient = prisma): Promise<Organization | null> {
  return client.organization.findUnique({ where: { cnpj } });
}

function update(
  id: string,
  data: Prisma.OrganizationUpdateInput,
  client: DbClient = prisma,
): Promise<Organization> {
  return client.organization.update({ where: { id }, data });
}

export const organizationsRepository = {
  create,
  findById,
  findByCnpj,
  update,
};
