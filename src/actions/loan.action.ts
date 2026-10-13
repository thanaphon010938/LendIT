"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin, requireUser } from "@/lib/auth";
import * as loanService from "@/services/loan.service";
import type { ActionResult } from "@/actions/equipment.action";
import { describeLoans, logAudit, type AuditActor } from "@/services/audit.service";
import { formatDate } from "@/lib/utils";

async function logLoans(admin: AuditActor, action: string, label: string, ids: string[], extra?: string) {
  await logAudit(admin, action, `${label}: ${await describeLoans(ids)}${extra ? ` · ${extra}` : ""}`, { type: "loan", id: ids[0] });
}

const selectedLoanItemSchema = z.object({
  equipmentId: z.string().min(1, "กรุณาเลือกอุปกรณ์"),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
});

const selectedLoanItemsSchema = z
  .array(selectedLoanItemSchema)
  .min(1, "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ")
  .max(200, "เลือกอุปกรณ์ได้ไม่เกิน 200 รายการต่อคำขอ")
  .superRefine((items, context) => {
    const equipmentIds = new Set<string>();
    items.forEach((item, index) => {
      if (equipmentIds.has(item.equipmentId)) {
        context.addIssue({
          code: "custom",
          path: [index, "equipmentId"],
          message: "พบอุปกรณ์ซ้ำในคำขอ",
        });
      }
      equipmentIds.add(item.equipmentId);
    });
  });

const singleLoanRequestSchema = z.object({
  equipmentId: z.string().min(1, "กรุณาเลือกอุปกรณ์"),
  dueDate: z.coerce.date({ message: "กรุณาระบุวันที่กำหนดคืน" }),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  purpose: z.string().trim().min(1, "กรุณากรอกวัตถุประสงค์ที่ยืม").max(500),
});

export async function requestLoanAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const selectedItemsRaw = formData.get("selectedItems");
    const dueDateRaw = formData.get("dueDate");
    const purposeRaw = formData.get("purpose");
    const requesterPhone = z.string().trim().max(30, "เบอร์ภายในต้องไม่เกิน 30 ตัวอักษร")
      .safeParse(String(formData.get("requesterPhone") ?? ""));

    let selectedItems: unknown;
    try {
      selectedItems =
        selectedItemsRaw !== null
          ? JSON.parse(String(selectedItemsRaw))
          : [{ equipmentId: String(formData.get("equipmentId") ?? ""), quantity: Number(formData.get("quantity") ?? 1) }];
    } catch {
      return { ok: false, message: "ข้อมูลรายการอุปกรณ์ไม่ถูกต้อง" };
    }

    const parsedItems = selectedLoanItemsSchema.safeParse(selectedItems);
    if (!parsedItems.success) {
      return { ok: false, message: parsedItems.error.issues[0]?.message ?? "ข้อมูลอุปกรณ์ไม่ถูกต้อง" };
    }

    const dueDate = singleLoanRequestSchema.shape.dueDate.safeParse(dueDateRaw);
    const purpose = singleLoanRequestSchema.shape.purpose.safeParse(purposeRaw);

    if (!dueDate.success) {
      return { ok: false, message: dueDate.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    if (!purpose.success) {
      return { ok: false, message: purpose.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }
    if (!requesterPhone.success) {
      return { ok: false, message: requesterPhone.error.issues[0]?.message ?? "ข้อมูลเบอร์ภายในไม่ถูกต้อง" };
    }

    await loanService.requestLoanGroup(
      user.id,
      parsedItems.data,
      { dueDate: dueDate.data, purpose: purpose.data },
      { requestGroupId: randomUUID(), requesterPhone: requesterPhone.data }
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/loans");
  revalidatePath("/equipment");
  redirect("/loans");
}

const loanIdsSchema = z.array(z.string().min(1)).min(1).max(200);

const unitAssignmentsSchema = z
  .array(z.object({ loanId: z.string().min(1), unitIds: z.array(z.string().min(1)).max(200) }))
  .max(200);

const droppedLinesSchema = z.object({ loanIds: z.array(z.string().min(1)).max(200), reason: z.string().max(500) }).optional();

export async function approveLoanAction(
  ids: string[],
  assignments: loanService.UnitAssignment[] = [],
  drop?: loanService.DroppedLines
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedAssignments = unitAssignmentsSchema.safeParse(assignments);
    const parsedDrop = droppedLinesSchema.safeParse(drop);
    if (!parsedIds.success || !parsedAssignments.success || !parsedDrop.success) {
      return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    }
    await loanService.approveLoan(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsedIds.data, parsedAssignments.data, parsedDrop.data);
    const dropped = parsedDrop.data?.loanIds ?? [];
    const approved = parsedIds.data.filter((id) => !dropped.includes(id));
    if (approved.length > 0) await logLoans(admin, "loan.approve", "อนุมัติคำขอยืม", approved);
    if (dropped.length > 0) await logLoans(admin, "loan.reject", "ไม่อนุมัติ (ไม่มีเครื่องทดแทน)", dropped, parsedDrop.data?.reason);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/loans");
  revalidatePath("/loans");
  revalidatePath("/equipment");
  return { ok: true, message: "อนุมัติคำขอยืมเรียบร้อย" };
}

export async function rejectLoanAction(ids: string[], reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedReason = z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500).safeParse(reason);
    if (!parsedIds.success) return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    if (!parsedReason.success) return { ok: false, message: parsedReason.error.issues[0]?.message ?? "กรุณาระบุเหตุผล" };
    await loanService.rejectLoan(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsedIds.data, parsedReason.data);
    await logLoans(admin, "loan.reject", "ปฏิเสธคำขอยืม", parsedIds.data, `เหตุผล: ${parsedReason.data}`);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/loans");
  revalidatePath("/loans");
  revalidatePath("/equipment");
  return { ok: true, message: "ปฏิเสธคำขอยืมเรียบร้อย" };
}

export async function revokeApprovalAction(ids: string[], reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedReason = z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500).safeParse(reason);
    if (!parsedIds.success) return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    if (!parsedReason.success) return { ok: false, message: parsedReason.error.issues[0]?.message ?? "กรุณาระบุเหตุผล" };
    await loanService.revokeApproval(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsedIds.data, parsedReason.data);
    await logLoans(admin, "loan.revoke", "ยกเลิกการอนุมัติ", parsedIds.data, `เหตุผล: ${parsedReason.data}`);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/loans");
  revalidatePath("/loans");
  revalidatePath("/equipment");
  return { ok: true, message: "ยกเลิกการอนุมัติเรียบร้อย คำขอกลับไปรออนุมัติ" };
}

const returnItemsSchema = z
  .array(
    z.object({
      loanId: z.string().min(1),
      condition: z.enum(["NORMAL", "DAMAGED", "BROKEN", "LOST"]),
      affectedQuantity: z.number().int().min(1),
      note: z.string().max(500),
      units: z
        .array(
          z.object({
            unitId: z.string().min(1),
            condition: z.enum(["NORMAL", "DAMAGED", "BROKEN", "LOST"]),
            note: z.string().max(500),
          })
        )
        .max(200)
        .optional(),
    })
  )
  .min(1)
  .max(200);

export async function returnLoanAction(ids: string[], items: loanService.ReturnItemInput[]): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedItems = returnItemsSchema.safeParse(items);
    if (!parsedIds.success || !parsedItems.success) return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    await loanService.returnLoan(admin.id, admin.name ?? "ผู้ดูแลระบบ", parsedIds.data, parsedItems.data);
    const problems = parsedItems.data
      .flatMap((item): { condition: string }[] => (item.units?.length ? item.units : [item]))
      .filter((u) => u.condition !== "NORMAL").length;
    await logLoans(admin, "loan.return", "รับคืนอุปกรณ์", parsedIds.data, problems > 0 ? `สภาพไม่ปกติ ${problems} รายการ` : "สภาพปกติทั้งหมด");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/loans");
  revalidatePath("/admin/issues");
  revalidatePath("/loans");
  revalidatePath("/equipment");
  return { ok: true, message: "บันทึกการคืนอุปกรณ์เรียบร้อย" };
}

export async function requestExtensionAction(ids: string[], newDueDate: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedDate = z.coerce.date({ message: "กรุณาเลือกวันคืนใหม่" }).safeParse(newDueDate);
    const parsedReason = z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500).safeParse(reason);
    if (!parsedIds.success) return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    if (!parsedDate.success) return { ok: false, message: parsedDate.error.issues[0]?.message ?? "วันที่ไม่ถูกต้อง" };
    if (!parsedReason.success) return { ok: false, message: parsedReason.error.issues[0]?.message ?? "กรุณาระบุเหตุผล" };
    await loanService.requestExtension(user.id, parsedIds.data, parsedDate.data, parsedReason.data);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/loans");
  revalidatePath("/admin/loans");
  revalidatePath("/");
  return { ok: true, message: "ส่งคำขอขยายเวลาแล้ว รอผู้ดูแลอนุมัติ" };
}

export async function reviewExtensionAction(ids: string[], approve: boolean, rejectReason = ""): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedIds = loanIdsSchema.safeParse(ids);
    const parsedReason = z.string().max(500).safeParse(rejectReason);
    if (!parsedIds.success || !parsedReason.success) return { ok: false, message: "ข้อมูลไม่ถูกต้อง" };
    await loanService.reviewExtension(admin.name ?? "ผู้ดูแลระบบ", parsedIds.data, approve, parsedReason.data);
    await logLoans(
      admin,
      approve ? "loan.extension.approve" : "loan.extension.reject",
      approve ? "อนุมัติขยายเวลา" : "ไม่อนุมัติขยายเวลา",
      parsedIds.data,
      approve ? undefined : `เหตุผล: ${parsedReason.data}`
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/loans");
  revalidatePath("/admin/loans");
  revalidatePath("/");
  return { ok: true, message: approve ? "อนุมัติการขยายเวลาแล้ว" : "ไม่อนุมัติการขยายเวลา" };
}

const onBehalfSchema = z.object({
  userId: z.string().min(1, "กรุณาเลือกผู้ยืม"),
  items: selectedLoanItemsSchema,
  dueDate: z.coerce.date({ message: "กรุณาระบุวันที่กำหนดคืน" }),
  purpose: z.string().trim().min(1, "กรุณากรอกวัตถุประสงค์ที่ยืม").max(500),
});

/** Walk-in request filed by an admin. Returns the request key so the UI can open approval right away. */
export async function createLoanOnBehalfAction(input: {
  userId: string;
  items: { equipmentId: string; quantity: number }[];
  dueDate: string;
  purpose: string;
}): Promise<ActionResult & { requestKey?: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = onBehalfSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    const { requestGroupId, loanIds } = await loanService.createLoanOnBehalf(
      admin.name ?? "ผู้ดูแลระบบ",
      parsed.data.userId,
      parsed.data.items,
      { dueDate: parsed.data.dueDate, purpose: parsed.data.purpose }
    );
    await logLoans(admin, "loan.create_on_behalf", "สร้างคำขอยืมแทนผู้ใช้", loanIds, `กำหนดคืน ${formatDate(parsed.data.dueDate)}`);
    revalidatePath("/admin/loans");
    revalidatePath("/loans");
    revalidatePath("/equipment");
    return { ok: true, message: "สร้างคำขอแล้ว", requestKey: requestGroupId };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
}

export async function cancelLoanAction(ids: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedIds = loanIdsSchema.safeParse(ids);
    if (!parsedIds.success) return { ok: false, message: "ข้อมูลรายการยืมไม่ถูกต้อง" };
    await loanService.cancelLoan(user.id, parsedIds.data);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/loans");
  revalidatePath("/equipment");
  return { ok: true, message: "ยกเลิกคำขอยืมเรียบร้อย" };
}
