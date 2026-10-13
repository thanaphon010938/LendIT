"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/services/audit.service";
import * as categoryService from "@/services/category.service";
import { createCategorySchema } from "@/validations/category.schema";
import type { ActionResult } from "@/actions/equipment.action";

function revalidateCategoryPages() {
  revalidatePath("/admin/equipment");
  revalidatePath("/equipment");
}

export async function createCategoryAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = createCategorySchema.safeParse({
      name: formData.get("name"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    await categoryService.createCategory(parsed.data);
    await logAudit(admin, "category.create", `เพิ่มประเภทอุปกรณ์ ${parsed.data.name}`);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidateCategoryPages();
  return { ok: true, message: "เพิ่มประเภทอุปกรณ์เรียบร้อย" };
}

export async function renameCategoryAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const parsed = createCategorySchema.safeParse({
      name: formData.get("name"),
    });

    if (!id) {
      return { ok: false, message: "ไม่พบประเภทอุปกรณ์" };
    }
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const before = await db.category.findUnique({ where: { id }, select: { name: true } });
    await categoryService.renameCategory(id, parsed.data);
    await logAudit(admin, "category.rename", `เปลี่ยนชื่อประเภท ${before?.name ?? ""} → ${parsed.data.name}`, { type: "category", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidateCategoryPages();
  return { ok: true, message: "เปลี่ยนชื่อประเภทอุปกรณ์เรียบร้อย" };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const before = await db.category.findUnique({ where: { id }, select: { name: true } });
    await categoryService.deleteCategory(id);
    await logAudit(admin, "category.delete", `ลบประเภทอุปกรณ์ ${before?.name ?? id}`, { type: "category", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidateCategoryPages();
  return { ok: true, message: "ลบประเภทอุปกรณ์เรียบร้อย" };
}
