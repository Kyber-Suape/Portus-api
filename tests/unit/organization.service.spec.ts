import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationType } from "@prisma/client";
import { organizationsService } from "../../src/modules/organizations/organizations.service";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository";
import { ConflictError, NotFoundError } from "../../src/shared/errors/HttpErrors";

vi.mock("../../src/modules/organizations/organizations.repository", () => ({
  organizationsRepository: {
    findById: vi.fn(),
    findByCnpj: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const baseOrganization = {
  id: "org-1",
  name: "Org",
  legalName: "Org Ltda",
  tradeName: "Org",
  cnpj: "11111111111111",
  organizationType: OrganizationType.SUPPLIER,
  institutionalEmail: "org@teste.com",
  institutionalPhone: "81999990000",
  cep: "55590000",
  state: "PE",
  city: "Ipojuca",
  district: "Suape",
  street: "Rua A",
  number: "1",
  complement: null,
  legalResponsibleName: "Resp",
  legalResponsibleCpf: "11111111111",
  legalResponsibleEmail: "resp@teste.com",
  legalResponsiblePhone: "81999990001",
  contractNumber: null,
  contractObject: null,
  serviceOrder: null,
  artRrt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("organizationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMine", () => {
    it("retorna a organização quando encontrada", async () => {
      vi.mocked(organizationsRepository.findById).mockResolvedValue(baseOrganization);

      const result = await organizationsService.getMine("org-1");

      expect(result).toEqual(baseOrganization);
      expect(organizationsRepository.findById).toHaveBeenCalledWith("org-1");
    });

    it("lança NotFoundError quando a organização não existe", async () => {
      vi.mocked(organizationsRepository.findById).mockResolvedValue(null);

      await expect(organizationsService.getMine("org-x")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateMine", () => {
    it("atualiza quando o CNPJ não pertence a outra organização", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(null);
      vi.mocked(organizationsRepository.update).mockResolvedValue({ ...baseOrganization, tradeName: "Novo" });

      const result = await organizationsService.updateMine("org-1", { tradeName: "Novo" });

      expect(result.tradeName).toBe("Novo");
    });

    it("lança ConflictError quando o CNPJ já pertence a outra organização", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue({ ...baseOrganization, id: "org-2" });

      await expect(
        organizationsService.updateMine("org-1", { cnpj: "22222222222222" }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(organizationsRepository.update).not.toHaveBeenCalled();
    });

    it("permite manter o próprio CNPJ sem conflito", async () => {
      vi.mocked(organizationsRepository.findByCnpj).mockResolvedValue(baseOrganization);
      vi.mocked(organizationsRepository.update).mockResolvedValue(baseOrganization);

      await expect(
        organizationsService.updateMine("org-1", { cnpj: baseOrganization.cnpj }),
      ).resolves.toEqual(baseOrganization);
    });
  });
});
