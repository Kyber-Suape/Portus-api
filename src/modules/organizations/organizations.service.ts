import { ConflictError, NotFoundError } from "../../shared/errors/HttpErrors";
import { organizationsRepository } from "./organizations.repository";
import type { UpdateOrganizationInput } from "./organizations.schemas";

async function getMine(organizationId: string) {
  const organization = await organizationsRepository.findById(organizationId);
  if (!organization) {
    throw new NotFoundError("Organização não encontrada.");
  }
  return organization;
}

async function updateMine(organizationId: string, input: UpdateOrganizationInput) {
  if (input.cnpj) {
    const existing = await organizationsRepository.findByCnpj(input.cnpj);
    if (existing && existing.id !== organizationId) {
      throw new ConflictError("Este CNPJ já está cadastrado para outra organização.");
    }
  }

  return organizationsRepository.update(organizationId, input);
}

export const organizationsService = {
  getMine,
  updateMine,
};
