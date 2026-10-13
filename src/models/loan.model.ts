import { db } from "@/lib/db";
import type { LoanStatus, Prisma } from "@prisma/client";

const loanInclude = {
  equipment: { include: { category: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: { select: { id: true, code: true, name: true } },
    },
  },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.LoanInclude;

export function findAllLoans(params?: { status?: LoanStatus; userId?: string }) {
  const where: Prisma.LoanWhereInput = {};
  if (params?.status) where.status = params.status;
  if (params?.userId) where.userId = params.userId;

  return db.loan.findMany({
    where,
    include: loanInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findLoanById(id: string) {
  return db.loan.findUnique({ where: { id }, include: loanInclude });
}

export function createLoan(data: Prisma.LoanCreateInput) {
  return db.loan.create({ data, include: loanInclude });
}

export function updateLoan(id: string, data: Prisma.LoanUpdateInput) {
  return db.loan.update({ where: { id }, data, include: loanInclude });
}

export function findLoansByIds(ids: string[]) {
  return db.loan.findMany({ where: { id: { in: ids } }, include: loanInclude });
}

export function findLoansByRequestGroupId(requestGroupId: string) {
  return db.loan.findMany({ where: { requestGroupId }, include: loanInclude });
}

export function updateLoansByIds(
  ids: string[],
  statuses: LoanStatus[],
  data: Prisma.LoanUpdateManyMutationInput
) {
  return db.loan.updateMany({ where: { id: { in: ids }, status: { in: statuses } }, data });
}

/** Sum of loan quantities per equipment for loans in the given statuses. */
export async function sumLoanQuantities(equipmentIds: string[], statuses: LoanStatus[]): Promise<Map<string, number>> {
  if (equipmentIds.length === 0) return new Map();

  const grouped = await db.loan.groupBy({
    by: ["equipmentId"],
    where: { equipmentId: { in: equipmentIds }, status: { in: statuses } },
    _sum: { quantity: true },
  });

  return new Map(
    grouped
      .filter((g): g is typeof g & { equipmentId: string } => Boolean(g.equipmentId))
      .map((g) => [g.equipmentId, g._sum.quantity ?? 0])
  );
}

/** Units held by open loans for the given equipment, split into reserved (PENDING) and on loan (APPROVED). */
export async function sumOpenQuantitiesByStatus(equipmentIds: string[]) {
  if (equipmentIds.length === 0) return { pending: 0, approved: 0 };

  const grouped = await db.loan.groupBy({
    by: ["status"],
    where: {
      equipmentId: { in: equipmentIds },
      status: { in: ["PENDING", "APPROVED"] },
    },
    _sum: { quantity: true },
  });

  const sumFor = (status: "PENDING" | "APPROVED") =>
    grouped.find((g) => g.status === status)?._sum.quantity ?? 0;
  return { pending: sumFor("PENDING"), approved: sumFor("APPROVED") };
}

export function countLoansByStatus() {
  return db.loan.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
}

export function findOverdueLoans() {
  return db.loan.findMany({
    where: {
      status: "APPROVED",
      dueDate: { lt: new Date() },
    },
    include: loanInclude,
  });
}

/** Loans needing admin attention: pending approval, or approved-but-overdue. Minimal fields only. */
export function findActionNeededLoans() {
  return db.loan.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        { status: "APPROVED", dueDate: { lt: new Date() } },
        { status: "APPROVED", extensionStatus: "PENDING" },
      ],
    },
    select: { id: true, requestGroupId: true },
  });
}
