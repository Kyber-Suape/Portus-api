import { OrganizationType } from "@prisma/client";
import type { OrganizationCoreInput } from "../../src/modules/organizations/organizations.schemas";

let sequence = 0;

function nextSequence(): number {
  sequence += 1;
  return sequence;
}

export function buildOrganizationPayload(
  overrides: Partial<OrganizationCoreInput> = {},
): OrganizationCoreInput {
  const n = nextSequence();

  return {
    name: `Organização Teste ${n}`,
    legalName: `Organização Teste ${n} Ltda.`,
    tradeName: `Teste ${n}`,
    cnpj: String(10000000000000 + n).slice(0, 14),
    organizationType: OrganizationType.SUPPLIER,
    institutionalEmail: `org${n}@teste.com.br`,
    institutionalPhone: "81999990000",
    cep: "55590000",
    state: "PE",
    city: "Ipojuca",
    district: "Suape",
    street: "Rod. PE-60",
    number: "1000",
    legalResponsibleName: `Responsável Teste ${n}`,
    legalResponsibleCpf: String(10000000000 + n).slice(0, 11),
    legalResponsibleEmail: `responsavel${n}@teste.com.br`,
    legalResponsiblePhone: "81988887777",
    ...overrides,
  };
}
