import { db } from "@/lib/db";
import type { Prisma, UnitStatus } from "@prisma/client";

export const unitSummarySelect = { id: true, assetTag: true, serialNumber: true, status: true } as const;

export function findUnitsByEquipment(equipmentId: string) {
  return db.equipmentUnit.findMany({ where: { equipmentId }, orderBy: { assetTag: "asc" } });
}

export function findUnitsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db.equipmentUnit.findMany({ where: { id: { in: ids } }, select: { ...unitSummarySelect, equipmentId: true } });
}

/** AVAILABLE units for the given equipment, oldest tag first (what an admin picks from on approval). */
export function findAvailableUnits(equipmentIds: string[]) {
  if (equipmentIds.length === 0) return Promise.resolve([]);
  return db.equipmentUnit.findMany({
    where: { equipmentId: { in: equipmentIds }, status: "AVAILABLE" },
    select: { ...unitSummarySelect, equipmentId: true },
    orderBy: { assetTag: "asc" },
  });
}

export function findUnitById(id: string) {
  return db.equipmentUnit.findUnique({ where: { id } });
}

export function findUnitByAssetTag(assetTag: string) {
  return db.equipmentUnit.findUnique({ where: { assetTag } });
}

export async function countUnitsByStatus(equipmentIds: string[], status: UnitStatus): Promise<Map<string, number>> {
  if (equipmentIds.length === 0) return new Map();
  const grouped = await db.equipmentUnit.groupBy({
    by: ["equipmentId"],
    where: { equipmentId: { in: equipmentIds }, status },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.equipmentId, g._count._all]));
}

export function createUnit(data: Prisma.EquipmentUnitUncheckedCreateInput) {
  return db.equipmentUnit.create({ data });
}

export function updateUnit(id: string, data: Prisma.EquipmentUnitUpdateInput) {
  return db.equipmentUnit.update({ where: { id }, data });
}

/** Open loans holding any of these devices, with the borrower, to show who has each one. */
export function findActiveLoansForUnits(unitIds: string[]) {
  if (unitIds.length === 0) return Promise.resolve([]);
  return db.loan.findMany({
    where: { status: "APPROVED", unitIds: { hasSome: unitIds } },
    select: { id: true, unitIds: true, dueDate: true, user: { select: { name: true } } },
  });
}

/** How many times each device has been lent out (any loan it was handed over on). */
export async function countLoansPerUnit(unitIds: string[]): Promise<Map<string, number>> {
  if (unitIds.length === 0) return new Map();
  const loans = await db.loan.findMany({ where: { unitIds: { hasSome: unitIds } }, select: { unitIds: true } });
  const counts = new Map<string, number>();
  for (const loan of loans) for (const id of loan.unitIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** Total devices still owned (anything not retired). Mirrored into Equipment.quantity. */
export function countOwnedUnits(equipmentId: string) {
  return db.equipmentUnit.count({ where: { equipmentId, status: { not: "RETIRED" } } });
}
