"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/services/audit.service";
import * as issueService from "@/services/equipment-issue.service";
import type { ActionResult } from "@/actions/equipment.action";

const resolveSchema = z.object({
  id: z.string().min(1),
  resolution: z.enum(["REPAIRED", "WRITTEN_OFF"]),
  note: z.string().max(500),
});

export async function reportUnitBrokenAction(unitId: string, note: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = z
      .object({ unitId: z.string().min(1), note: z.string().trim().min(3, "กรุณาระบุอาการอย่างน้อย 3 ตัวอักษร").max(500) })
      .safeParse({ unitId, note });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    await issueService.reportUnitBroken(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsed.data.unitId, parsed.data.note);
    const unit = await db.equipmentUnit.findUnique({ where: { id: parsed.data.unitId }, select: { assetTag: true, equipment: { select: { name: true } } } });
    await logAudit(admin, "unit.report_broken", `แจ้งเครื่องเสียก่อนส่งมอบ ${unit?.assetTag ?? ""} (${unit?.equipment.name ?? ""}) · อาการ: ${parsed.data.note}`, {
      type: "unit",
      id: parsed.data.unitId,
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/issues");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/equipment", "layout");
  revalidatePath("/equipment");
  return { ok: true, message: "ส่งเครื่องเข้ารายการรอซ่อมแล้ว" };
}

export async function resolveIssueAction(
  id: string,
  resolution: "REPAIRED" | "WRITTEN_OFF",
  note: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = resolveSchema.safeParse({ id, resolution, note });
    if (!parsed.success) return { ok: false, message: "ข้อมูลไม่ถูกต้อง" };
    await issueService.resolveIssue(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsed.data.id, parsed.data.resolution, parsed.data.note);
    const issue = await db.equipmentIssue.findUnique({
      where: { id: parsed.data.id },
      select: { quantity: true, unit: { select: { assetTag: true } }, equipment: { select: { name: true } } },
    });
    await logAudit(
      admin,
      parsed.data.resolution === "REPAIRED" ? "issue.repaired" : "issue.written_off",
      `${parsed.data.resolution === "REPAIRED" ? "ซ่อมเสร็จ" : "ตัดจำหน่าย"} ${issue?.unit?.assetTag ?? `${issue?.quantity ?? ""} ชิ้น`} (${issue?.equipment.name ?? ""})`,
      { type: "issue", id: parsed.data.id }
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/issues");
  revalidatePath("/admin/equipment");
  revalidatePath("/equipment");
  revalidatePath("/");
  return { ok: true, message: resolution === "REPAIRED" ? "บันทึกซ่อมเสร็จแล้ว" : "ตัดจำหน่ายเรียบร้อย" };
}
