"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import * as equipmentService from "@/services/equipment.service";
import { z } from "zod";
import { createEquipmentSchema, updateEquipmentSchema } from "@/validations/equipment.schema";
import { db } from "@/lib/db";
import { logAudit } from "@/services/audit.service";

const unitLabel = async (id: string) => {
  const unit = await db.equipmentUnit.findUnique({ where: { id }, select: { assetTag: true, serialNumber: true, equipment: { select: { name: true } } } });
  return unit ? `${unit.assetTag} (${unit.equipment.name})` : id;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export async function createEquipmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = createEquipmentSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      categoryId: formData.get("categoryId"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
      quantity: formData.get("quantity"),
      status: formData.get("status") || "ACTIVE",
      hiddenFromUsers: formData.get("hiddenFromUsers") === "on" || formData.get("hiddenFromUsers") === "true",
      trackUnits: formData.get("trackUnits") === "on" || formData.get("trackUnits") === "true",
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const created = await equipmentService.createEquipment(parsed.data);
    await logAudit(
      admin,
      "equipment.create",
      `เพิ่มอุปกรณ์ ${created.code} ${created.name} · ${parsed.data.quantity} ${parsed.data.trackUnits ? "เครื่อง (รายเครื่อง)" : "ชิ้น"}`,
      { type: "equipment", id: created.id }
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/equipment", "layout");
  revalidatePath("/admin/equipment", "layout");
  return { ok: true, message: "เพิ่มอุปกรณ์เรียบร้อย" };
}

export async function updateEquipmentAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = updateEquipmentSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
      quantity: formData.get("quantity"),
      status: formData.get("status"),
      hiddenFromUsers: formData.get("hiddenFromUsers") === "on" || formData.get("hiddenFromUsers") === "true",
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const updated = await equipmentService.updateEquipment(parsed.data);
    await logAudit(admin, "equipment.update", `แก้ไขข้อมูลอุปกรณ์ ${updated.code} ${updated.name}`, { type: "equipment", id: updated.id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/equipment", "layout");
  revalidatePath("/admin/equipment", "layout");
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteEquipmentAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const equipment = await db.equipment.findUnique({ where: { id }, select: { code: true, name: true } });
    await equipmentService.deleteEquipment(id);
    await logAudit(admin, "equipment.delete", `ลบอุปกรณ์ ${equipment?.code ?? ""} ${equipment?.name ?? id}`, { type: "equipment", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
  return { ok: true, message: "ลบอุปกรณ์เรียบร้อย" };
}

function revalidateEquipment(equipmentId?: string) {
  revalidatePath("/equipment", "layout");
  revalidatePath("/admin/equipment", "layout");
  if (equipmentId) revalidatePath(`/admin/equipment/${equipmentId}`);
}

export async function addUnitsAction(equipmentId: string, count: number, serialNumber: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = z
      .object({ equipmentId: z.string().min(1), count: z.number().int().min(1).max(100), serialNumber: z.string().max(100) })
      .safeParse({ equipmentId, count, serialNumber });
    if (!parsed.success) return { ok: false, message: "ข้อมูลไม่ถูกต้อง" };
    await equipmentService.addUnits(parsed.data.equipmentId, parsed.data.count, parsed.data.serialNumber);
    const equipment = await db.equipment.findUnique({ where: { id: parsed.data.equipmentId }, select: { code: true, name: true } });
    await logAudit(admin, "unit.add", `เพิ่มเครื่อง ${parsed.data.count} เครื่อง ให้ ${equipment?.code ?? ""} ${equipment?.name ?? ""}`, {
      type: "equipment",
      id: parsed.data.equipmentId,
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateEquipment(equipmentId);
  return { ok: true, message: "เพิ่มเครื่องเรียบร้อย" };
}

export async function updateUnitAction(
  id: string,
  data: { assetTag: string; serialNumber: string; note: string }
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = z
      .object({
        assetTag: z.string().trim().min(2, "กรุณากรอกรหัสครุภัณฑ์").max(60),
        serialNumber: z.string().max(100),
        note: z.string().max(500),
      })
      .safeParse(data);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    const before = await db.equipmentUnit.findUnique({ where: { id }, select: { assetTag: true, serialNumber: true } });
    await equipmentService.updateUnitDetails(id, parsed.data);
    const changes = [
      before?.assetTag !== parsed.data.assetTag.trim() && `รหัส ${before?.assetTag} → ${parsed.data.assetTag.trim()}`,
      (before?.serialNumber ?? "") !== parsed.data.serialNumber.trim() && `S/N ${before?.serialNumber || "-"} → ${parsed.data.serialNumber.trim() || "-"}`,
    ].filter(Boolean);
    await logAudit(admin, "unit.update", `แก้ไขข้อมูลเครื่อง ${await unitLabel(id)}${changes.length ? ` · ${changes.join(", ")}` : ""}`, { type: "unit", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateEquipment();
  return { ok: true, message: "บันทึกข้อมูลเครื่องเรียบร้อย" };
}

export async function setUnitHeldAction(id: string, held: boolean): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await equipmentService.setUnitHeld(id, held);
    await logAudit(admin, held ? "unit.hold" : "unit.release", `${held ? "เก็บเครื่องไว้ ไม่ให้ยืม" : "เปิดให้ยืมเครื่อง"} ${await unitLabel(id)}`, { type: "unit", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateEquipment();
  return { ok: true, message: held ? "เก็บเครื่องไว้ ไม่ให้ยืมแล้ว" : "เปิดให้ยืมเครื่องนี้แล้ว" };
}

export async function retireUnitAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await equipmentService.retireUnit(id);
    await logAudit(admin, "unit.retire", `ปลดระวางเครื่อง ${await unitLabel(id)}`, { type: "unit", id });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateEquipment();
  return { ok: true, message: "ปลดระวางเครื่องเรียบร้อย" };
}