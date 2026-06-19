-- CreateEnum
CREATE TYPE "RdoStatus" AS ENUM ('DRAFT', 'SENT_TO_REVIEW', 'UNDER_EXTERNAL_REVIEW', 'EXTERNAL_APPROVED', 'REJECTED_BY_EXTERNAL', 'UNDER_SUAPE_REVIEW', 'APPROVED', 'REJECTED_BY_SUAPE', 'SIGNATURE_PENDING', 'SIGNED', 'REOPENED', 'CANCELED');

-- CreateEnum
CREATE TYPE "RdoShift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "RdoActivityStatus" AS ENUM ('IN_PROGRESS', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RdoEquipmentStatus" AS ENUM ('IN_OPERATION', 'IDLE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'RAINY', 'CLOUDY');

-- CreateEnum
CREATE TYPE "GroundStatus" AS ENUM ('DRY', 'WET', 'MUDDY');

-- CreateEnum
CREATE TYPE "RdoOccurrenceType" AS ENUM ('SAFETY', 'OPERATIONAL', 'ENVIRONMENTAL', 'QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "RdoSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RdoNonConformityStatus" AS ENUM ('OPEN', 'IN_ANALYSIS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RdoEvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'FILE');

-- CreateEnum
CREATE TYPE "RdoEvidenceUploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "RdoEvidenceValidationStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RdoReviewStage" AS ENUM ('EXTERNAL', 'SUAPE');

-- CreateEnum
CREATE TYPE "RdoReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "rdos" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "workLabel" TEXT,
    "contractLabel" TEXT,
    "authorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "RdoShift" NOT NULL,
    "siteEngineerName" TEXT NOT NULL,
    "siteEngineerRegistry" TEXT,
    "foremanName" TEXT,
    "notes" TEXT,
    "status" "RdoStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_activities" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RdoActivityStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "aiSuggestionUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_teams" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_equipments" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "operator" TEXT,
    "hours" DOUBLE PRECISION DEFAULT 0,
    "status" "RdoEquipmentStatus" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_weather" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "morningCondition" "WeatherCondition",
    "afternoonCondition" "WeatherCondition",
    "nightCondition" "WeatherCondition",
    "minTemperature" DOUBLE PRECISION,
    "maxTemperature" DOUBLE PRECISION,
    "groundStatus" "GroundStatus" NOT NULL DEFAULT 'DRY',
    "hadStoppage" BOOLEAN NOT NULL DEFAULT false,
    "stoppageReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_weather_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_occurrences" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "type" "RdoOccurrenceType" NOT NULL,
    "location" TEXT NOT NULL,
    "severity" "RdoSeverity" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_non_conformities" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "RdoSeverity" NOT NULL,
    "status" "RdoNonConformityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdo_non_conformities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_evidences" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "type" "RdoEvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "caption" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "altitudeMeters" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "uploadStatus" "RdoEvidenceUploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "validationStatus" "RdoEvidenceValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rdo_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_reviews" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "stage" "RdoReviewStage" NOT NULL,
    "decision" "RdoReviewDecision" NOT NULL,
    "comments" TEXT,
    "reviewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rdo_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_status_history" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "fromStatus" "RdoStatus",
    "toStatus" "RdoStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rdo_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdo_comments" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rdo_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rdos_organizationId_idx" ON "rdos"("organizationId");

-- CreateIndex
CREATE INDEX "rdos_status_idx" ON "rdos"("status");

-- CreateIndex
CREATE INDEX "rdos_authorId_idx" ON "rdos"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "rdos_organizationId_number_key" ON "rdos"("organizationId", "number");

-- CreateIndex
CREATE INDEX "rdo_activities_rdoId_idx" ON "rdo_activities"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_teams_rdoId_idx" ON "rdo_teams"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_equipments_rdoId_idx" ON "rdo_equipments"("rdoId");

-- CreateIndex
CREATE UNIQUE INDEX "rdo_weather_rdoId_key" ON "rdo_weather"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_occurrences_rdoId_idx" ON "rdo_occurrences"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_non_conformities_rdoId_idx" ON "rdo_non_conformities"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_evidences_rdoId_idx" ON "rdo_evidences"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_reviews_rdoId_idx" ON "rdo_reviews"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_status_history_rdoId_idx" ON "rdo_status_history"("rdoId");

-- CreateIndex
CREATE INDEX "rdo_comments_rdoId_idx" ON "rdo_comments"("rdoId");

-- AddForeignKey
ALTER TABLE "rdos" ADD CONSTRAINT "rdos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdos" ADD CONSTRAINT "rdos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_activities" ADD CONSTRAINT "rdo_activities_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_teams" ADD CONSTRAINT "rdo_teams_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_equipments" ADD CONSTRAINT "rdo_equipments_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_weather" ADD CONSTRAINT "rdo_weather_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_occurrences" ADD CONSTRAINT "rdo_occurrences_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_non_conformities" ADD CONSTRAINT "rdo_non_conformities_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_evidences" ADD CONSTRAINT "rdo_evidences_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_evidences" ADD CONSTRAINT "rdo_evidences_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_evidences" ADD CONSTRAINT "rdo_evidences_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_reviews" ADD CONSTRAINT "rdo_reviews_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_reviews" ADD CONSTRAINT "rdo_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_status_history" ADD CONSTRAINT "rdo_status_history_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_status_history" ADD CONSTRAINT "rdo_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_comments" ADD CONSTRAINT "rdo_comments_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "rdos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdo_comments" ADD CONSTRAINT "rdo_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

