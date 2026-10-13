import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export function findAllCategories() {
  return db.category.findMany({ orderBy: { name: "asc" } });
}

export function findCategoryById(id: string) {
  return db.category.findUnique({ where: { id } });
}

export function findCategoryByName(name: string) {
  return db.category.findUnique({ where: { name } });
}

export function createCategory(data: Prisma.CategoryCreateInput) {
  return db.category.create({ data });
}

export function updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
  return db.category.update({ where: { id }, data });
}

export function deleteCategory(id: string) {
  return db.category.delete({ where: { id } });
}

export function countEquipmentByCategoryId(categoryId: string) {
  return db.equipment.count({ where: { categoryId } });
}

export function countEquipmentByCategory() {
  return db.equipment.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
  });
}
