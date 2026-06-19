import { OrganizationType, PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSION_KEYS, seedPermissionsCatalog } from "./permissions-catalog";

if (process.env.NODE_ENV === "production") {
  console.error("Seed bloqueado: NODE_ENV=production. Esta seed é apenas para desenvolvimento.");
  process.exit(1);
}

const prisma = new PrismaClient();

const DEMO_ORGANIZATION = {
  name: "Empresa Executora Demo",
  legalName: "Empresa Executora Demo Ltda.",
  tradeName: "Demo Engenharia",
  cnpj: "12345678000190",
  organizationType: OrganizationType.SUPPLIER,
  institutionalEmail: "contato@demoengenharia.com.br",
  institutionalPhone: "8133334444",
  cep: "55590000",
  state: "PE",
  city: "Ipojuca",
  district: "Suape",
  street: "Rod. PE-60",
  number: "1000",
  complement: "Galpão 3",
  legalResponsibleName: "Maria Demo",
  legalResponsibleCpf: "11122233344",
  legalResponsibleEmail: "maria.demo@demoengenharia.com.br",
  legalResponsiblePhone: "81988887777",
  notes: "Organização de demonstração criada pela seed.",
};

const DEMO_ADMIN = {
  name: "Administrador Demo",
  cpf: "00011122233",
  email: "admin@portus.dev",
  phone: "81999990000",
  password: "Admin@123456",
};

const DEMO_PASSWORD = "Demo@123456";

const DEMO_INVITED_USERS = [
  { name: "Fiscal SUAPE Demo", email: "fiscal.suape@portus.dev", phone: "81999990001", role: UserRole.SUAPE_INSPECTOR },
  { name: "Fiscal Externo Demo", email: "fiscal.externo@portus.dev", phone: "81999990002", role: UserRole.EXTERNAL_INSPECTOR },
  { name: "Fornecedor Demo", email: "fornecedor@portus.dev", phone: "81999990003", role: UserRole.SUPPLIER },
  { name: "Auditor Demo", email: "auditoria@portus.dev", phone: "81999990004", role: UserRole.AUDITOR },
];

async function main() {
  await seedPermissionsCatalog(prisma);

  const organization = await prisma.organization.upsert({
    where: { cnpj: DEMO_ORGANIZATION.cnpj },
    update: DEMO_ORGANIZATION,
    create: DEMO_ORGANIZATION,
  });

  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN.password, 10);

  await prisma.user.upsert({
    where: { email: DEMO_ADMIN.email },
    update: {
      name: DEMO_ADMIN.name,
      cpf: DEMO_ADMIN.cpf,
      phone: DEMO_ADMIN.phone,
      passwordHash: adminPasswordHash,
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: organization.id,
    },
    create: {
      name: DEMO_ADMIN.name,
      cpf: DEMO_ADMIN.cpf,
      email: DEMO_ADMIN.email,
      phone: DEMO_ADMIN.phone,
      passwordHash: adminPasswordHash,
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: organization.id,
    },
  });

  const invitedPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const invited of DEMO_INVITED_USERS) {
    await prisma.user.upsert({
      where: { email: invited.email },
      update: {
        name: invited.name,
        phone: invited.phone,
        passwordHash: invitedPasswordHash,
        role: invited.role,
        status: UserStatus.ACTIVE,
        organizationId: organization.id,
      },
      create: {
        name: invited.name,
        email: invited.email,
        phone: invited.phone,
        passwordHash: invitedPasswordHash,
        role: invited.role,
        status: UserStatus.ACTIVE,
        organizationId: organization.id,
      },
    });
  }

  console.log("Seed concluída:");
  console.log(`  Permissões: ${ALL_PERMISSION_KEYS.length} no catálogo`);
  console.log(`  Organização: ${organization.name} (${organization.cnpj})`);
  console.log(`  Administrador: ${DEMO_ADMIN.email} / senha: ${DEMO_ADMIN.password}`);
  console.log(`  Usuários (senha "${DEMO_PASSWORD}"): ${DEMO_INVITED_USERS.map((u) => u.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("Falha ao executar a seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
