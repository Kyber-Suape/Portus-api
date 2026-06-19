-- Os RDOs existentes até aqui são 100% dados de seed/demonstração (não há usuário real em
-- produção ainda). Em vez de inventar um backfill heurístico de Work a partir do texto livre
-- workLabel/contractLabel para satisfazer o novo FK NOT NULL, truncamos e o `prisma/seed.ts`
-- recria tudo do zero já vinculado a obras reais.
TRUNCATE TABLE
  "rdo_comments",
  "rdo_status_history",
  "rdo_reviews",
  "rdo_evidences",
  "rdo_non_conformities",
  "rdo_occurrences",
  "rdo_weather",
  "rdo_equipments",
  "rdo_teams",
  "rdo_activities",
  "rdos"
CASCADE;

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- AlterTable
ALTER TABLE "rdos" ADD COLUMN     "contractObjectSnapshot" TEXT,
ADD COLUMN     "contractedCompanySnapshot" TEXT,
ADD COLUMN     "externalInspectorSnapshot" TEXT,
ADD COLUMN     "suapeInspectorSnapshot" TEXT,
ADD COLUMN     "workId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "works" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractNumber" TEXT,
    "contractObject" TEXT,
    "description" TEXT,
    "contractType" TEXT,
    "status" "WorkStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "contractedCompanyName" TEXT NOT NULL,
    "contractedCompanyCnpj" TEXT NOT NULL,
    "contractedCompanyResponsibleName" TEXT NOT NULL,
    "contractedCompanyResponsibleEmail" TEXT,
    "contractedCompanyResponsiblePhone" TEXT,
    "suapeInspectorId" TEXT NOT NULL,
    "externalInspectorId" TEXT,
    "contractManagerId" TEXT,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3) NOT NULL,
    "executionStartDate" TIMESTAMP(3),
    "expectedCompletionDate" TIMESTAMP(3),
    "durationDays" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_users" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permissions" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_documents" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_additives" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "newEndDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_additives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "works_organizationId_idx" ON "works"("organizationId");

-- CreateIndex
CREATE INDEX "works_status_idx" ON "works"("status");

-- CreateIndex
CREATE INDEX "work_users_workId_idx" ON "work_users"("workId");

-- CreateIndex
CREATE INDEX "work_users_userId_idx" ON "work_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_users_workId_userId_key" ON "work_users"("workId", "userId");

-- CreateIndex
CREATE INDEX "work_permissions_workId_idx" ON "work_permissions"("workId");

-- CreateIndex
CREATE INDEX "work_permissions_userId_idx" ON "work_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_permissions_workId_userId_permissionId_key" ON "work_permissions"("workId", "userId", "permissionId");

-- CreateIndex
CREATE INDEX "work_documents_workId_idx" ON "work_documents"("workId");

-- CreateIndex
CREATE INDEX "work_additives_workId_idx" ON "work_additives"("workId");

-- CreateIndex
CREATE INDEX "rdos_workId_idx" ON "rdos"("workId");

-- AddForeignKey
ALTER TABLE "rdos" ADD CONSTRAINT "rdos_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_suapeInspectorId_fkey" FOREIGN KEY ("suapeInspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_externalInspectorId_fkey" FOREIGN KEY ("externalInspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_contractManagerId_fkey" FOREIGN KEY ("contractManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_users" ADD CONSTRAINT "work_users_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_users" ADD CONSTRAINT "work_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permissions" ADD CONSTRAINT "work_permissions_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permissions" ADD CONSTRAINT "work_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permissions" ADD CONSTRAINT "work_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_documents" ADD CONSTRAINT "work_documents_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_documents" ADD CONSTRAINT "work_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_additives" ADD CONSTRAINT "work_additives_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_additives" ADD CONSTRAINT "work_additives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
