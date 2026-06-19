import { PrismaClient, UserRole } from "@prisma/client";

export interface PermissionCatalogEntry {
  feature: string;
  action: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { feature: "users", action: "create", description: "Criar usuários na organização" },
  { feature: "users", action: "read", description: "Visualizar usuários da organização" },
  { feature: "users", action: "update", description: "Editar usuários da organização" },
  { feature: "users", action: "delete", description: "Remover usuários da organização" },
  { feature: "organization", action: "read", description: "Visualizar dados da organização" },
  { feature: "organization", action: "update", description: "Editar dados da organização" },
  { feature: "permissions", action: "read", description: "Visualizar permissões de usuários" },
  { feature: "permissions", action: "update", description: "Editar permissões de usuários" },
  { feature: "roles", action: "read", description: "Visualizar perfis e seus padrões de permissão" },
  { feature: "dashboard", action: "read", description: "Visualizar o dashboard" },
  { feature: "works", action: "create", description: "Cadastrar obras" },
  { feature: "works", action: "read", description: "Visualizar obras" },
  { feature: "works", action: "update", description: "Editar obras" },
  { feature: "works", action: "delete", description: "Remover obras" },
  { feature: "contracts", action: "create", description: "Cadastrar contratos" },
  { feature: "contracts", action: "read", description: "Visualizar contratos" },
  { feature: "contracts", action: "update", description: "Editar contratos" },
  { feature: "contracts", action: "delete", description: "Remover contratos" },
  { feature: "rdo", action: "create", description: "Criar RDOs" },
  { feature: "rdo", action: "read", description: "Visualizar RDOs" },
  { feature: "rdo", action: "update", description: "Editar RDOs" },
  { feature: "rdo", action: "delete", description: "Remover RDOs" },
  { feature: "rdo", action: "approve", description: "Aprovar RDOs" },
  { feature: "rdo", action: "reject", description: "Reprovar RDOs" },
  { feature: "rdo", action: "reopen", description: "Reabrir RDOs" },
  { feature: "rdo", action: "sign", description: "Assinar RDOs eletronicamente" },
  { feature: "rdo", action: "submit", description: "Enviar RDOs para revisão" },
  { feature: "rdo", action: "review", description: "Participar da fila de revisão de RDOs" },
  { feature: "rdo", action: "comment", description: "Comentar em RDOs" },
  { feature: "rdo", action: "add_evidence", description: "Anexar evidências a um RDO" },
  { feature: "rdo", action: "delete_evidence", description: "Remover evidências de um RDO" },
  { feature: "rdo", action: "view_history", description: "Visualizar o histórico de status de um RDO" },
  { feature: "rdo", action: "manage_all", description: "Gerenciar qualquer RDO da organização, independente de autoria" },
  { feature: "evidences", action: "create", description: "Enviar evidências (fotos/vídeos/arquivos)" },
  { feature: "evidences", action: "read", description: "Visualizar evidências" },
  { feature: "evidences", action: "update", description: "Editar legenda/metadados de evidências" },
  { feature: "evidences", action: "delete", description: "Remover evidências" },
  { feature: "evidences", action: "validate_geo", description: "Validar evidências e sua geolocalização" },
  { feature: "ai", action: "generate_rdo_text", description: "Gerar sugestão de texto para atividades do RDO via IA" },
  { feature: "ai", action: "transcribe_audio", description: "Transcrever áudio para texto via IA" },
  { feature: "work_users", action: "create", description: "Vincular usuários a uma obra" },
  { feature: "work_users", action: "read", description: "Visualizar usuários vinculados a uma obra" },
  { feature: "work_users", action: "update", description: "Editar o vínculo de um usuário com uma obra" },
  { feature: "work_users", action: "delete", description: "Remover o vínculo de um usuário com uma obra" },
  { feature: "work_permissions", action: "create", description: "Conceder permissões específicas de uma obra a um usuário" },
  { feature: "work_permissions", action: "read", description: "Visualizar permissões específicas de uma obra" },
  { feature: "work_permissions", action: "update", description: "Editar permissões específicas de uma obra" },
  { feature: "work_permissions", action: "delete", description: "Remover permissões específicas de uma obra" },
  { feature: "work_documents", action: "create", description: "Enviar documentos técnicos de uma obra" },
  { feature: "work_documents", action: "read", description: "Visualizar documentos técnicos de uma obra" },
  { feature: "work_documents", action: "update", description: "Editar documentos técnicos de uma obra" },
  { feature: "work_documents", action: "delete", description: "Remover documentos técnicos de uma obra" },
  { feature: "work_additives", action: "create", description: "Cadastrar aditivos contratuais" },
  { feature: "work_additives", action: "read", description: "Visualizar aditivos contratuais" },
  { feature: "work_additives", action: "update", description: "Editar aditivos contratuais" },
  { feature: "work_additives", action: "delete", description: "Remover aditivos contratuais" },
  { feature: "dashboard", action: "works_read", description: "Visualizar indicadores de obras no dashboard" },
  { feature: "dashboard", action: "contracts_read", description: "Visualizar indicadores de contratos no dashboard" },
  { feature: "dashboard", action: "rdos_read", description: "Visualizar indicadores de RDOs no dashboard" },
  { feature: "dashboard", action: "alerts_read", description: "Visualizar alertas críticos no dashboard" },
  { feature: "reports", action: "read", description: "Visualizar relatórios" },
  { feature: "reports", action: "export", description: "Exportar relatórios (PDF)" },
  { feature: "audit", action: "read", description: "Visualizar trilha de auditoria" },
  { feature: "integrations", action: "read", description: "Visualizar integrações" },
  { feature: "integrations", action: "update", description: "Configurar integrações" },
  { feature: "fields", action: "read", description: "Visualizar configuração de campos do RDO" },
  { feature: "fields", action: "update", description: "Configurar campos do RDO por obra/contrato" },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => `${p.feature}:${p.action}`);

export const ROLE_DEFAULTS: Record<UserRole, string[]> = {
  SYSTEM_ADMIN: ALL_PERMISSION_KEYS,
  SUAPE_INSPECTOR: [
    "users:read",
    "organization:read",
    "dashboard:read",
    "works:read",
    "contracts:read",
    "rdo:read",
    "rdo:update",
    "rdo:approve",
    "rdo:reject",
    "rdo:reopen",
    "rdo:sign",
    "rdo:review",
    "rdo:comment",
    "rdo:view_history",
    "rdo:delete",
    "evidences:read",
    "evidences:update",
    "evidences:validate_geo",
    "work_users:read",
    "work_documents:read",
    "work_additives:read",
    "dashboard:works_read",
    "dashboard:contracts_read",
    "dashboard:rdos_read",
    "dashboard:alerts_read",
    "reports:read",
    "reports:export",
    "audit:read",
  ],
  EXTERNAL_INSPECTOR: [
    "dashboard:read",
    "works:read",
    "contracts:read",
    "rdo:read",
    "rdo:update",
    "rdo:review",
    "rdo:approve",
    "rdo:reject",
    "rdo:comment",
    "rdo:view_history",
    "evidences:read",
    "evidences:update",
    "evidences:validate_geo",
    "work_documents:read",
    "dashboard:works_read",
    "dashboard:rdos_read",
    "reports:read",
  ],
  SUPPLIER: [
    "dashboard:read",
    "works:read",
    "rdo:create",
    "rdo:read",
    "rdo:update",
    "rdo:delete",
    "rdo:submit",
    "rdo:comment",
    "rdo:add_evidence",
    "evidences:create",
    "evidences:read",
    "ai:generate_rdo_text",
    "ai:transcribe_audio",
    "work_documents:read",
    "dashboard:works_read",
    "dashboard:rdos_read",
    "reports:read",
  ],
  AUDITOR: [
    "dashboard:read",
    "works:read",
    "contracts:read",
    "rdo:read",
    "rdo:view_history",
    "evidences:read",
    "work_documents:read",
    "work_additives:read",
    "dashboard:works_read",
    "dashboard:contracts_read",
    "dashboard:rdos_read",
    "dashboard:alerts_read",
    "reports:read",
    "reports:export",
    "audit:read",
  ],
};

/** Semea o catálogo de permissões e os defaults por papel (idempotente via upsert). Reaproveitado por `prisma/seed.ts` e pelo setup global dos testes. */
export async function seedPermissionsCatalog(prisma: PrismaClient): Promise<void> {
  const permissionIdByKey = new Map<string, string>();

  for (const { feature, action, description } of PERMISSION_CATALOG) {
    const key = `${feature}:${action}`;
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { feature, action, description },
      create: { key, feature, action, description },
    });
    permissionIdByKey.set(key, permission.id);
  }

  for (const role of Object.keys(ROLE_DEFAULTS) as UserRole[]) {
    for (const key of ROLE_DEFAULTS[role]) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId } },
        update: {},
        create: { role, permissionId },
      });
    }
  }
}
