import * as categoryModel from "@/models/category.model";
import type { CreateCategoryInput } from "@/validations/category.schema";

export class CategoryServiceError extends Error {}

export function listCategories() {
  return categoryModel.findAllCategories();
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await categoryModel.findCategoryByName(input.name);
  if (existing) {
    throw new CategoryServiceError("ประเภทอุปกรณ์นี้มีอยู่ในระบบแล้ว");
  }

  return categoryModel.createCategory({ name: input.name });
}

export async function renameCategory(id: string, input: CreateCategoryInput) {
  const category = await categoryModel.findCategoryById(id);
  if (!category) {
    throw new CategoryServiceError("ไม่พบประเภทอุปกรณ์");
  }

  const existing = await categoryModel.findCategoryByName(input.name);
  if (existing && existing.id !== id) {
    throw new CategoryServiceError("ประเภทอุปกรณ์นี้มีอยู่ในระบบแล้ว");
  }

  return categoryModel.updateCategory(id, { name: input.name });
}

export async function deleteCategory(id: string) {
  const category = await categoryModel.findCategoryById(id);
  if (!category) {
    throw new CategoryServiceError("ไม่พบประเภทอุปกรณ์");
  }

  const equipmentCount = await categoryModel.countEquipmentByCategoryId(id);
  if (equipmentCount > 0) {
    throw new CategoryServiceError("ไม่สามารถลบประเภทนี้ได้ เนื่องจากยังมีอุปกรณ์ที่ใช้งานภายใต้ประเภทนี้");
  }

  return categoryModel.deleteCategory(id);
}
