import { db } from "@/lib/db";
import type { IssueStatus } from "@prisma/client";

const issueInclude = {
  equipment: { select: { id: true, code: true, name: true, quantity: true, category: { select: { name: true } } } },
  unit: { select: { id: true, assetTag: true, serialNumber: true } },
} as const;

export function findIssues(params?: { status?: IssueStatus }) {
  return db.equipmentIssue.findMany({
    where: params?.status ? { status: params.status } : undefined,
    include: issueInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findIssueById(id: string) {
  return db.equipmentIssue.findUnique({ where: { id }, include: issueInclude });
}

export function countOpenIssues() {
  return db.equipmentIssue.count({ where: { status: "OPEN" } });
}

/** Units per equipment currently held out of the loanable pool by open issues. */
export async function getOpenIssueQuantities(equipmentIds: string[]): Promise<Map<string, number>> {
  if (equipmentIds.length === 0) return new Map();

  const grouped = await db.equipmentIssue.groupBy({
    by: ["equipmentId"],
    where: { equipmentId: { in: equipmentIds }, status: "OPEN" },
    _sum: { quantity: true },
  });

  return new Map(grouped.map((g) => [g.equipmentId, g._sum.quantity ?? 0]));
}
