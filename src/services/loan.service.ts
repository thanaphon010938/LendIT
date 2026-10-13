import * as loanModel from "@/models/loan.model";
import * as equipmentModel from "@/models/equipment.model";
import * as unitModel from "@/models/equipment-unit.model";
import { getAvailableQuantity } from "@/services/equipment.service";
import type { CreateLoanInput } from "@/validations/loan.schema";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { LoanStatus, Prisma, ReturnCondition } from "@prisma/client";

export class LoanServiceError extends Error {}

export type LoanUnit = { id: string; assetTag: string; serialNumber: string | null; returnCondition: ReturnCondition | null; returnNote: string | null };

/** Loans with the devices handed over on each line (asset tag, serial, and condition on return). */
export async function listLoans(params?: { status?: LoanStatus; userId?: string }) {
  const loans = await loanModel.findAllLoans(params);
  const units = new Map((await unitModel.findUnitsByIds(Array.from(new Set(loans.flatMap((l) => l.unitIds))))).map((u) => [u.id, u]));

  return loans.map((loan) => ({
    ...loan,
    units: loan.unitIds.flatMap((unitId): LoanUnit[] => {
      const unit = units.get(unitId);
      if (!unit) return [];
      const returned = loan.unitReturns.find((r) => r.unitId === unitId);
      return [
        {
          id: unit.id,
          assetTag: unit.assetTag,
          serialNumber: unit.serialNumber,
          returnCondition: returned?.condition ?? null,
          returnNote: returned?.note ?? null,
        },
      ];
    }),
  }));
}

export function sumOpenQuantities(equipmentIds: string[]) {
  return loanModel.sumOpenQuantitiesByStatus(equipmentIds);
}

/** Number of distinct loan requests needing admin attention (pending approval or overdue). */
export async function countActionNeeded() {
  const loans = await loanModel.findActionNeededLoans();
  const groupKeys = new Set(loans.map((loan) => loan.requestGroupId ?? loan.id));
  return groupKeys.size;
}

export function getLoanDetail(id: string) {
  return loanModel.findLoanById(id);
}

async function validateLoanItem(equipmentId: string, quantity: number) {
  const equipment = await equipmentModel.findEquipmentById(equipmentId);
  if (!equipment) throw new LoanServiceError("ไม่พบอุปกรณ์ที่ต้องการยืม");
  if (equipment.status !== "ACTIVE") {
    throw new LoanServiceError(`อุปกรณ์ ${equipment.name} ไม่พร้อมให้ยืมในขณะนี้`);
  }

  const availableQuantity = await getAvailableQuantity(equipment);
  if (quantity > availableQuantity) {
    throw new LoanServiceError(`อุปกรณ์ ${equipment.name} เหลือให้ยืมเพียง ${availableQuantity} ชิ้น`);
  }
  return equipment;
}

export async function requestLoan(
  userId: string,
  input: CreateLoanInput,
  metadata?: { requestGroupId?: string; requesterPhone?: string }
) {
  const equipmentIds = input.equipmentIds.length > 0 ? input.equipmentIds : [input.equipmentId];
  const primaryEquipmentId = equipmentIds[0];

  if (!primaryEquipmentId) {
    throw new LoanServiceError("กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ");
  }

  await Promise.all(equipmentIds.map((equipmentId) => validateLoanItem(equipmentId, input.quantity)));

  if (input.dueDate <= new Date()) {
    throw new LoanServiceError("วันที่กำหนดคืนต้องอยู่ในอนาคต");
  }

  return loanModel.createLoan({
    equipment: { connect: { id: primaryEquipmentId } },
    equipmentIds,
    user: { connect: { id: userId } },
    dueDate: input.dueDate,
    quantity: input.quantity,
    purpose: input.purpose,
    status: "PENDING",
    requestGroupId: metadata?.requestGroupId,
    requesterPhone: metadata?.requesterPhone?.trim() || undefined,
  });
}

export async function requestLoanGroup(
  userId: string,
  items: { equipmentId: string; quantity: number }[],
  details: { dueDate: Date; purpose: string },
  metadata: { requestGroupId: string; requesterPhone?: string }
) {
  if (items.length === 0) throw new LoanServiceError("กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ");
  if (items.length > 200) throw new LoanServiceError("เลือกอุปกรณ์ได้ไม่เกิน 200 รายการต่อคำขอ");
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new LoanServiceError("จำนวนต้องเป็นจำนวนเต็มและมากกว่า 0");
  }
  if (new Set(items.map((item) => item.equipmentId)).size !== items.length) {
    throw new LoanServiceError("พบอุปกรณ์ซ้ำในคำขอ");
  }
  if (details.dueDate <= new Date()) throw new LoanServiceError("วันที่กำหนดคืนต้องอยู่ในอนาคต");

  await Promise.all(items.map((item) => validateLoanItem(item.equipmentId, item.quantity)));

  return Promise.all(items.map((item) =>
    loanModel.createLoan({
      equipment: { connect: { id: item.equipmentId } },
      equipmentIds: [item.equipmentId],
      user: { connect: { id: userId } },
      dueDate: details.dueDate,
      quantity: item.quantity,
      purpose: details.purpose,
      status: "PENDING",
      requestGroupId: metadata.requestGroupId,
      requesterPhone: metadata.requesterPhone?.trim() || undefined,
    })
  ));
}

type LoanWithRelations = Awaited<ReturnType<typeof loanModel.findLoansByIds>>[number];

/**
 * Load every line of one request and check it is in `status`.
 * Group actions must cover the whole request so a request never ends up half-approved/returned.
 */
async function loadGroup(ids: string[], status: LoanStatus, wrongStatusMessage: string, partialMessage: string) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) throw new LoanServiceError("ไม่พบรายการยืม");

  const loans = await loanModel.findLoansByIds(uniqueIds);
  if (loans.length !== uniqueIds.length) throw new LoanServiceError("ไม่พบรายการยืมครบทุกชิ้น");

  const groupKeys = new Set(loans.map((loan) => loan.requestGroupId ?? loan.id));
  if (groupKeys.size !== 1) throw new LoanServiceError("รายการที่เลือกไม่ได้อยู่ในคำขอเดียวกัน");
  const groupedId = loans[0].requestGroupId;
  if (groupedId) {
    const completeGroup = await loanModel.findLoansByRequestGroupId(groupedId);
    if (completeGroup.length !== uniqueIds.length || completeGroup.some((loan) => !uniqueIds.includes(loan.id))) {
      throw new LoanServiceError(partialMessage);
    }
  }
  if (loans.some((loan) => loan.status !== status)) throw new LoanServiceError(wrongStatusMessage);
  return loans;
}

/**
 * Admin files a request for a walk-in borrower at the IT counter. It goes through the same checks as a
 * self-service request and lands as PENDING, so the admin then approves it and picks devices as usual.
 */
export async function createLoanOnBehalf(
  adminName: string,
  userId: string,
  items: { equipmentId: string; quantity: number }[],
  details: { dueDate: Date; purpose: string }
) {
  const borrower = await db.user.findUnique({ where: { id: userId }, select: { approvalStatus: true, isActive: true, phone: true } });
  if (!borrower || borrower.approvalStatus !== "APPROVED" || borrower.isActive === false) {
    throw new LoanServiceError("ผู้ใช้นี้ไม่อยู่ในสถานะที่ยืมได้ (ยังไม่อนุมัติหรือถูกระงับ)");
  }
  const requestGroupId = randomUUID();
  const created = await requestLoanGroup(userId, items, details, { requestGroupId, requesterPhone: borrower.phone ?? undefined });
  await db.loan.updateMany({ where: { id: { in: created.map((loan) => loan.id) } }, data: { createdByAdminName: adminName } });
  return { requestGroupId, loanIds: created.map((loan) => loan.id) };
}

async function getPendingGroup(ids: string[]) {
  const loans = await loadGroup(
    ids,
    "PENDING",
    "คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติแล้ว",
    "ต้องดำเนินการกับอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );
  return loans.map((loan) => loan.id);
}

const STALE = "สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่";

/** Thrown inside interactive transactions so the whole transaction rolls back with a readable message. */
class StaleStateError extends LoanServiceError {}

export type UnitAssignment = { loanId: string; unitIds: string[] };

/**
 * Approve a request. For asset-tracked equipment the admin must pick exactly `quantity`
 * AVAILABLE devices per line; they become ON_LOAN and are recorded on the loan.
 */
/** Lines that can't be fulfilled (e.g. the only device broke at handover), declined with a note for the borrower. */
export type DroppedLines = { loanIds: string[]; reason: string };

export async function approveLoan(
  adminId: string,
  adminName: string,
  ids: string[],
  assignments: UnitAssignment[],
  drop?: DroppedLines
) {
  const group = await loadGroup(
    ids,
    "PENDING",
    "คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติแล้ว",
    "ต้องดำเนินการกับอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );

  const droppedIds = new Set(drop?.loanIds ?? []);
  if (Array.from(droppedIds).some((id) => !group.some((loan) => loan.id === id))) {
    throw new LoanServiceError("รายการที่ไม่อนุมัติไม่ได้อยู่ในคำขอนี้");
  }
  if (droppedIds.size > 0 && (drop?.reason.trim().length ?? 0) < 3) {
    throw new LoanServiceError("กรุณาระบุหมายเหตุถึงผู้ยืมอย่างน้อย 3 ตัวอักษร");
  }
  // Nothing left to approve: this is a plain rejection with the note.
  if (droppedIds.size === group.length) {
    return rejectLoan(adminId, adminName, ids, drop!.reason);
  }
  const loans = group.filter((loan) => !droppedIds.has(loan.id));
  const dropped = group.filter((loan) => droppedIds.has(loan.id));

  const unitsByLoan = new Map(assignments.map((a) => [a.loanId, Array.from(new Set(a.unitIds))]));
  const allUnitIds = loans.flatMap((loan) => unitsByLoan.get(loan.id) ?? []);
  if (new Set(allUnitIds).size !== allUnitIds.length) throw new LoanServiceError("เลือกเครื่องซ้ำกันในคำขอ");
  const units = new Map((await unitModel.findUnitsByIds(allUnitIds)).map((u) => [u.id, u]));

  for (const loan of loans) {
    const picked = unitsByLoan.get(loan.id) ?? [];
    const name = loan.equipment?.name ?? "อุปกรณ์";
    if (!loan.equipment?.trackUnits) {
      if (picked.length > 0) throw new LoanServiceError(`${name} ไม่ได้เก็บข้อมูลรายเครื่อง`);
      continue;
    }
    if (picked.length !== loan.quantity) {
      throw new LoanServiceError(`กรุณาเลือกเครื่อง ${name} ให้ครบ ${loan.quantity} เครื่อง`);
    }
    for (const unitId of picked) {
      const unit = units.get(unitId);
      if (!unit || unit.equipmentId !== loan.equipmentId) throw new LoanServiceError(`เครื่องที่เลือกไม่ใช่รุ่น ${name}`);
      if (unit.status !== "AVAILABLE") throw new LoanServiceError(`เครื่อง ${unit.assetTag} ไม่ว่างแล้ว`);
    }
  }

  const approvedAt = new Date();
  try {
    await db.$transaction(async (tx) => {
      for (const loan of loans) {
        const picked = unitsByLoan.get(loan.id) ?? [];
        await tx.loan.update({
          where: { id: loan.id, status: "PENDING" },
          data: { status: "APPROVED", approvedByUserId: adminId, approvedByName: adminName, approvedAt, unitIds: picked },
        });
      }
      // Declined lines leave the request as their own rejected entry, so every request keeps a single
      // status and the borrower sees exactly which item wasn't available and why.
      if (dropped.length > 0) {
        const splitGroupId = randomUUID();
        for (const loan of dropped) {
          await tx.loan.update({
            where: { id: loan.id, status: "PENDING" },
            data: {
              status: "REJECTED",
              requestGroupId: splitGroupId,
              rejectedByUserId: adminId,
              rejectedByName: adminName,
              rejectedAt: approvedAt,
              rejectionReason: drop!.reason.trim(),
            },
          });
        }
      }
      if (allUnitIds.length > 0) {
        const moved = await tx.equipmentUnit.updateMany({
          where: { id: { in: allUnitIds }, status: "AVAILABLE" },
          data: { status: "ON_LOAN" },
        });
        if (moved.count !== allUnitIds.length) throw new StaleStateError("มีเครื่องที่เลือกถูกใช้ไปแล้ว กรุณาเลือกใหม่");
      }
    });
  } catch (error) {
    throw error instanceof StaleStateError ? error : new LoanServiceError(STALE);
  }
}

export async function rejectLoan(adminId: string, adminName: string, ids: string[], reason: string) {
  const loanIds = await getPendingGroup(ids);
  const result = await loanModel.updateLoansByIds(loanIds, ["PENDING"], {
    status: "REJECTED",
    rejectedByUserId: adminId,
    rejectedByName: adminName,
    rejectedAt: new Date(),
    rejectionReason: reason.trim(),
  });
  if (result.count !== loanIds.length) throw new LoanServiceError(STALE);
}

/** Undo a mistaken approval: the request goes back to PENDING and its devices back to AVAILABLE. */
export async function revokeApproval(adminId: string, adminName: string, ids: string[], reason: string) {
  const loans = await loadGroup(
    ids,
    "APPROVED",
    "ยกเลิกการอนุมัติได้เฉพาะคำขอที่กำลังยืมอยู่",
    "ต้องยกเลิกการอนุมัติอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );
  const unitIds = loans.flatMap((loan) => loan.unitIds);
  const revokedAt = new Date();

  try {
    await db.$transaction(async (tx) => {
      for (const loan of loans) {
        await tx.loan.update({
          where: { id: loan.id, status: "APPROVED" },
          data: {
            status: "PENDING",
            unitIds: [],
            // An open extension request belonged to the revoked approval.
            ...(loan.extensionStatus === "PENDING" && { extensionStatus: null, extensionRequestedDueDate: null }),
            approvedByUserId: null,
            approvedByName: null,
            approvedAt: null,
            approvalRevokedAt: revokedAt,
            approvalRevokedByUserId: adminId,
            approvalRevokedByName: adminName,
            approvalRevokeReason: reason.trim(),
          },
        });
      }
      if (unitIds.length > 0) {
        await tx.equipmentUnit.updateMany({ where: { id: { in: unitIds }, status: "ON_LOAN" }, data: { status: "AVAILABLE" } });
      }
    });
  } catch {
    throw new LoanServiceError(STALE);
  }
}

const MAX_EXTENSION_DAYS_FROM_TODAY = 60;

/** Borrower asks to push back the due date of a request they have out. One open request at a time. */
export async function requestExtension(userId: string, ids: string[], newDueDate: Date, reason: string) {
  const loans = await loadGroup(
    ids,
    "APPROVED",
    "ขอขยายเวลาได้เฉพาะรายการที่กำลังยืมอยู่",
    "ต้องขอขยายเวลาอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );
  if (loans.some((loan) => loan.userId !== userId)) throw new LoanServiceError("คุณไม่มีสิทธิ์ขอขยายเวลารายการนี้");
  if (loans.some((loan) => loan.extensionStatus === "PENDING")) {
    throw new LoanServiceError("มีคำขอขยายเวลาที่รออนุมัติอยู่แล้ว");
  }

  const currentDue = new Date(loans[0].dueDate);
  const latest = new Date();
  latest.setDate(latest.getDate() + MAX_EXTENSION_DAYS_FROM_TODAY);
  if (newDueDate <= currentDue) throw new LoanServiceError("วันคืนใหม่ต้องอยู่หลังวันกำหนดคืนเดิม");
  if (newDueDate <= new Date()) throw new LoanServiceError("วันคืนใหม่ต้องอยู่ในอนาคต");
  if (newDueDate > latest) throw new LoanServiceError(`ขยายได้ไม่เกิน ${MAX_EXTENSION_DAYS_FROM_TODAY} วันนับจากวันนี้`);
  if (reason.trim().length < 3) throw new LoanServiceError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");

  const result = await loanModel.updateLoansByIds(
    loans.map((loan) => loan.id),
    ["APPROVED"],
    {
      extensionStatus: "PENDING",
      extensionRequestedDueDate: newDueDate,
      extensionReason: reason.trim(),
      extensionRequestedAt: new Date(),
      extensionReviewedByName: null,
      extensionReviewedAt: null,
      extensionRejectReason: null,
    }
  );
  if (result.count !== loans.length) throw new LoanServiceError(STALE);
}

/** Admin decision on a pending extension. Approving moves the due date; the first due date is kept. */
export async function reviewExtension(adminName: string, ids: string[], approve: boolean, rejectReason = "") {
  const loans = await loadGroup(
    ids,
    "APPROVED",
    "คำขอนี้ไม่ได้อยู่ในสถานะกำลังยืมแล้ว",
    "ต้องพิจารณาอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );
  if (loans.some((loan) => loan.extensionStatus !== "PENDING" || !loan.extensionRequestedDueDate)) {
    throw new LoanServiceError("ไม่มีคำขอขยายเวลาที่รออนุมัติ");
  }
  if (!approve && rejectReason.trim().length < 3) throw new LoanServiceError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");

  const reviewedAt = new Date();
  try {
    await db.$transaction(
      loans.map((loan) =>
        db.loan.update({
          where: { id: loan.id, status: "APPROVED", extensionStatus: "PENDING" },
          data: approve
            ? {
                extensionStatus: "APPROVED",
                dueDate: loan.extensionRequestedDueDate!,
                originalDueDate: loan.originalDueDate ?? loan.dueDate,
                extensionReviewedByName: adminName,
                extensionReviewedAt: reviewedAt,
              }
            : {
                extensionStatus: "REJECTED",
                extensionReviewedByName: adminName,
                extensionReviewedAt: reviewedAt,
                extensionRejectReason: rejectReason.trim(),
              },
        })
      )
    );
  } catch {
    throw new LoanServiceError(STALE);
  }
}

export type ReturnItemInput = {
  loanId: string;
  /** Stock-count lines: one condition for the line, `affectedQuantity` of its units. */
  condition: ReturnCondition;
  affectedQuantity: number;
  note: string;
  /** Asset-tracked lines: the condition of every device handed over. */
  units?: { unitId: string; condition: ReturnCondition; note: string }[];
};

const SEVERITY: ReturnCondition[] = ["NORMAL", "DAMAGED", "BROKEN", "LOST"];
const worst = (conditions: ReturnCondition[]) =>
  conditions.reduce<ReturnCondition>((acc, c) => (SEVERITY.indexOf(c) > SEVERITY.indexOf(acc) ? c : acc), "NORMAL");

const UNIT_STATUS_AFTER_RETURN: Record<ReturnCondition, "AVAILABLE" | "IN_REPAIR" | "LOST"> = {
  NORMAL: "AVAILABLE",
  DAMAGED: "AVAILABLE",
  BROKEN: "IN_REPAIR",
  LOST: "LOST",
};

function needsNote(condition: ReturnCondition, note: string) {
  return condition !== "NORMAL" && note.trim().length < 3;
}

export async function returnLoan(adminId: string, adminName: string, ids: string[], items: ReturnItemInput[]) {
  const loans = await loadGroup(
    ids,
    "APPROVED",
    "คำขอนี้ไม่ได้อยู่ในสถานะกำลังยืมแล้ว",
    "ต้องบันทึกคืนอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน"
  );

  const itemByLoan = new Map(items.map((item) => [item.loanId, item]));
  for (const loan of loans) {
    const item = itemByLoan.get(loan.id);
    const name = loan.equipment?.name ?? "อุปกรณ์";
    if (!item) throw new LoanServiceError("กรุณาระบุสภาพอุปกรณ์ให้ครบทุกรายการ");

    if (loan.unitIds.length > 0) {
      const reported = new Map((item.units ?? []).map((u) => [u.unitId, u]));
      if (reported.size !== loan.unitIds.length || loan.unitIds.some((id) => !reported.has(id))) {
        throw new LoanServiceError(`กรุณาระบุสภาพของ ${name} ให้ครบทุกเครื่อง`);
      }
      if (Array.from(reported.values()).some((u) => needsNote(u.condition, u.note))) {
        throw new LoanServiceError(`กรุณาระบุรายละเอียดของเครื่อง ${name} ที่สภาพไม่ปกติ`);
      }
    } else {
      if (needsNote(item.condition, item.note)) throw new LoanServiceError(`กรุณาระบุรายละเอียดสภาพของ ${name}`);
      if (item.condition !== "NORMAL" && (!Number.isInteger(item.affectedQuantity) || item.affectedQuantity < 1 || item.affectedQuantity > loan.quantity)) {
        throw new LoanServiceError(`จำนวนที่มีปัญหาของ ${name} ไม่ถูกต้อง`);
      }
    }
  }

  const returnDate = new Date();
  try {
    await db.$transaction(async (tx) => {
      for (const loan of loans) {
        await returnLine(tx, loan, itemByLoan.get(loan.id)!, { adminId, adminName, returnDate });
      }
    });
  } catch (error) {
    throw error instanceof StaleStateError ? error : new LoanServiceError(STALE);
  }
}

async function returnLine(
  tx: Prisma.TransactionClient,
  loan: LoanWithRelations,
  item: ReturnItemInput,
  ctx: { adminId: string; adminName: string; returnDate: Date }
) {
  const reported = { reportedByUserId: ctx.adminId, reportedByName: ctx.adminName };

  if (loan.unitIds.length > 0) {
    const units = loan.unitIds.map((unitId) => {
      const u = item.units!.find((x) => x.unitId === unitId)!;
      return { unitId, condition: u.condition, note: u.condition === "NORMAL" ? null : u.note.trim() };
    });
    await tx.loan.update({
      where: { id: loan.id, status: "APPROVED" },
      data: {
        status: "RETURNED",
        returnDate: ctx.returnDate,
        returnedByUserId: ctx.adminId,
        returnedByName: ctx.adminName,
        returnCondition: worst(units.map((u) => u.condition)),
        returnNote: units.map((u) => u.note).filter(Boolean).join(" · ") || null,
        unitReturns: units,
      },
    });
    for (const unit of units) {
      const moved = await tx.equipmentUnit.updateMany({
        where: { id: unit.unitId, status: "ON_LOAN" },
        data: { status: UNIT_STATUS_AFTER_RETURN[unit.condition] },
      });
      if (moved.count !== 1) throw new StaleStateError(STALE);
      if ((unit.condition === "BROKEN" || unit.condition === "LOST") && loan.equipmentId) {
        await tx.equipmentIssue.create({
          data: { equipmentId: loan.equipmentId, unitId: unit.unitId, loanId: loan.id, condition: unit.condition, quantity: 1, note: unit.note!, ...reported },
        });
      }
    }
    return;
  }

  const note = item.condition === "NORMAL" ? null : item.note.trim();
  await tx.loan.update({
    where: { id: loan.id, status: "APPROVED" },
    data: {
      status: "RETURNED",
      returnDate: ctx.returnDate,
      returnedByUserId: ctx.adminId,
      returnedByName: ctx.adminName,
      returnCondition: item.condition,
      returnNote: note,
    },
  });
  // Broken/lost stock leaves the loanable pool until an admin resolves the issue.
  if ((item.condition === "BROKEN" || item.condition === "LOST") && loan.equipmentId) {
    await tx.equipmentIssue.create({
      data: { equipmentId: loan.equipmentId, loanId: loan.id, condition: item.condition, quantity: item.affectedQuantity, note: note!, ...reported },
    });
  }
}

export async function cancelLoan(userId: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  const loans = await loanModel.findLoansByIds(uniqueIds);
  if (uniqueIds.length === 0 || loans.length !== uniqueIds.length) {
    throw new LoanServiceError("ไม่พบรายการยืมครบทุกชิ้น");
  }
  if (loans.some((loan) => loan.userId !== userId)) {
    throw new LoanServiceError("คุณไม่มีสิทธิ์ยกเลิกรายการนี้");
  }
  const groupKeys = new Set(loans.map((loan) => loan.requestGroupId ?? loan.id));
  if (groupKeys.size !== 1) throw new LoanServiceError("รายการที่เลือกไม่ได้อยู่ในคำขอเดียวกัน");
  const groupedId = loans[0].requestGroupId;
  if (groupedId) {
    const completeGroup = await loanModel.findLoansByRequestGroupId(groupedId);
    if (completeGroup.length !== uniqueIds.length || completeGroup.some((loan) => !uniqueIds.includes(loan.id))) {
      throw new LoanServiceError("ต้องยกเลิกอุปกรณ์ทั้งหมดในคำขอนี้พร้อมกัน");
    }
  }
  if (loans.some((loan) => loan.status !== "PENDING")) {
    throw new LoanServiceError("ยกเลิกได้เฉพาะรายการที่รออนุมัติ");
  }

  const result = await loanModel.updateLoansByIds(uniqueIds, ["PENDING"], {
    status: "CANCELLED",
    cancelledAt: new Date(),
  });
  if (result.count !== uniqueIds.length) throw new LoanServiceError("สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่");
}
