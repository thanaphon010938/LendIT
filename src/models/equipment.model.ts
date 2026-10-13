import { db } from "@/lib/db";
import type { EquipmentStatus, Prisma } from "@prisma/client";

export function findAllEquipment(
  params?: {
    status?: EquipmentStatus;
    categoryId?: string;
    search?: string;
  },
  options?: { includeHidden?: boolean }
) {
  const where: Prisma.EquipmentWhereInput = {};

  if (!options?.includeHidden) {
    where.NOT = { hiddenFromUsers: true };
  }

  if (params?.status) {
    where.status = params.status;
  }
  if (params?.categoryId) {
    where.categoryId = params.categoryId;
  }
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search } },
      { code: { contains: params.search } },
    ];
  }

  return db.equipment.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findEquipmentById(id: string) {
  return db.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      loans: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export function findEquipmentByCode(code: string) {
  return db.equipment.findUnique({ where: { code } });
}

export function createEquipment(data: Prisma.EquipmentCreateInput) {
  return db.equipment.create({ data });
}

export function updateEquipment(id: string, data: Prisma.EquipmentUpdateInput) {
  return db.equipment.update({ where: { id }, data });
}

export function deleteEquipment(id: string) {
  return db.equipment.delete({ where: { id } });
}

export function countEquipmentByStatus() {
  return db.equipment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { quantity: true },
  });
}
