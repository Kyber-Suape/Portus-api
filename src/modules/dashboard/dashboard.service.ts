import { RdoStatus, WorkStatus } from "@prisma/client";
import { prisma } from "../../config/database";

const PENDING_RDO_STATUSES: RdoStatus[] = [RdoStatus.UNDER_EXTERNAL_REVIEW, RdoStatus.UNDER_SUAPE_REVIEW];
const CONTRACT_EXPIRATION_WINDOW_DAYS = 30;
/** Heurística: um RDO em rascunho aberto há mais de 2 dias é tratado como "atrasado" — não há campo de prazo explícito no RDO. */
const OVERDUE_DRAFT_DAYS = 2;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Apenas leitura/agregação — sem repository dedicado, é uma simplificação deliberada para endpoints puramente analíticos. */
async function getSummary(organizationId: string) {
  const now = new Date();
  const overdueDraftCutoff = new Date(Date.now() - OVERDUE_DRAFT_DAYS * 24 * 60 * 60 * 1000);
  const expirationWindow = daysFromNow(CONTRACT_EXPIRATION_WINDOW_DAYS);

  const [
    activeWorks,
    contractsNearExpiration,
    rdosCreated,
    rdosPending,
    rdosOverdue,
    pendingApprovals,
    approvedReviews,
  ] = await Promise.all([
    prisma.work.count({ where: { organizationId, status: WorkStatus.ACTIVE } }),
    prisma.work.count({
      where: { organizationId, status: WorkStatus.ACTIVE, contractEndDate: { gte: now, lte: expirationWindow } },
    }),
    prisma.rdo.count({ where: { organizationId } }),
    prisma.rdo.count({ where: { organizationId, status: { in: PENDING_RDO_STATUSES } } }),
    prisma.rdo.count({ where: { organizationId, status: RdoStatus.DRAFT, createdAt: { lt: overdueDraftCutoff } } }),
    prisma.rdo.count({ where: { organizationId, status: RdoStatus.UNDER_SUAPE_REVIEW } }),
    prisma.rdo.findMany({
      where: { organizationId, status: RdoStatus.APPROVED, submittedAt: { not: null } },
      select: { submittedAt: true, updatedAt: true },
    }),
  ]);

  const averageApprovalSlaDays =
    approvedReviews.length === 0
      ? null
      : approvedReviews.reduce((sum, rdo) => {
          const elapsedMs = rdo.updatedAt.getTime() - (rdo.submittedAt as Date).getTime();
          return sum + elapsedMs / (1000 * 60 * 60 * 24);
        }, 0) / approvedReviews.length;

  return {
    activeWorks,
    contractsInProgress: activeWorks,
    contractsNearExpiration,
    rdosCreated,
    rdosPending,
    rdosOverdue,
    pendingApprovals,
    averageApprovalSlaDays: averageApprovalSlaDays === null ? null : Math.round(averageApprovalSlaDays * 10) / 10,
    criticalAlertsCount: contractsNearExpiration + rdosOverdue,
  };
}

async function getWorksBreakdown(organizationId: string) {
  const counts = await prisma.work.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(Object.values(WorkStatus).map((status) => [status, 0])) as Record<
    WorkStatus,
    number
  >;
  for (const row of counts) byStatus[row.status] = row._count._all;

  const now = new Date();
  const expirationWindow = daysFromNow(CONTRACT_EXPIRATION_WINDOW_DAYS);
  const expiringSoon = await prisma.work.findMany({
    where: { organizationId, status: WorkStatus.ACTIVE, contractEndDate: { gte: now, lte: expirationWindow } },
    select: { id: true, name: true, contractNumber: true, contractEndDate: true },
    orderBy: { contractEndDate: "asc" },
    take: 10,
  });

  return { byStatus, expiringSoon };
}

async function getRdosBreakdown(organizationId: string) {
  const counts = await prisma.rdo.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(Object.values(RdoStatus).map((status) => [status, 0])) as Record<
    RdoStatus,
    number
  >;
  for (const row of counts) byStatus[row.status] = row._count._all;

  const recent = await prisma.rdo.findMany({
    where: { organizationId },
    select: { id: true, number: true, workLabel: true, status: true, date: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return { byStatus, recent };
}

async function getAlerts(organizationId: string) {
  const now = new Date();
  const overdueDraftCutoff = new Date(Date.now() - OVERDUE_DRAFT_DAYS * 24 * 60 * 60 * 1000);
  const expirationWindow = daysFromNow(CONTRACT_EXPIRATION_WINDOW_DAYS);

  const [expiringContracts, overdueRdos] = await Promise.all([
    prisma.work.findMany({
      where: { organizationId, status: WorkStatus.ACTIVE, contractEndDate: { gte: now, lte: expirationWindow } },
      select: { id: true, name: true, contractNumber: true, contractEndDate: true },
      orderBy: { contractEndDate: "asc" },
    }),
    prisma.rdo.findMany({
      where: { organizationId, status: RdoStatus.DRAFT, createdAt: { lt: overdueDraftCutoff } },
      select: { id: true, number: true, workLabel: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    contractsNearExpiration: expiringContracts.map((work) => ({
      type: "contract_expiration" as const,
      workId: work.id,
      workName: work.name,
      contractNumber: work.contractNumber,
      contractEndDate: work.contractEndDate,
    })),
    overdueRdos: overdueRdos.map((rdo) => ({
      type: "overdue_rdo" as const,
      rdoId: rdo.id,
      rdoNumber: rdo.number,
      workLabel: rdo.workLabel,
      createdAt: rdo.createdAt,
    })),
  };
}

export const dashboardService = {
  getSummary,
  getWorksBreakdown,
  getRdosBreakdown,
  getAlerts,
};
