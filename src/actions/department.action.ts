"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/services/audit.service";
import * as departmentService from "@/services/department.service";
import { createDepartmentSchema, updateDepartmentSchema } from "@/validations/department.schema";
import type { ActionResult } from "@/actions/equipment.action";

export async function createDepartmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = createDepartmentSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    await departmentService.createDepartment(parsed.data);
    await logAudit(admin, "department.create", `เพิ่มแผนก ${parsed.data.code} ${parsed.data.name}`);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/profile");
  return { ok: true, message: "เพิ่มแผนกเรียบร้อย" };
}

export async function updateDepartmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = updateDepartmentSchema.safeParse({
      id: formData.get("id"),
      code: formData.get("code"),
      name: formData.get("name"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    await departmentService.updateDepartment(parsed.data);
    await logAudit(admin, "department.update", `แก้ไขแผนก ${parsed.data.code ?? ""} ${parsed.data.name ?? ""}`.trim(), { type: "department", id: parsed.data.id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/profile");
  return { ok: true, message: "แก้ไขแผนกเรียบร้อย" };
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    if (!id) {
      return { ok: false, message: "ไม่พบไอดีแผนก" };
    }

    const before = await db.department.findUnique({ where: { id }, select: { code: true, name: true } });
    await departmentService.deleteDepartment(id);
    await logAudit(admin, "department.delete", `ลบแผนก ${before?.code ?? ""} ${before?.name ?? id}`, { type: "department", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/profile");
  return { ok: true, message: "ลบแผนกเรียบร้อย" };
}
