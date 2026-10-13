import { db } from "@/lib/db";
import * as issueModel from "@/models/equipment-issue.model";
import { syncTrackedQuantity } from "@/services/equipment.service";
import type { IssueStatus } from "@prisma/client";

export class EquipmentIssueServiceError extends Error {}

export function listIssues(status?: IssueStatus) {
  return issueModel.findIssues(status ? { status } : undefined);
}

export function countOpenIssues() {
  return issueModel.countOpenIssues();
}

/**
 * Report an idle device as broken outside a return, e.g. found faulty while checking it before handover.
 * It leaves the loanable pool (IN_REPAIR) until resolved on the repair page.
 */
export async function reportUnitBroken(adminId: string, adminName: string, unitId: string, note: string) {
  const unit = await db.equipmentUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw new EquipmentIssueServiceError("ไม่พบเครื่องนี้");
  if (unit.status !== "AVAILABLE" && unit.status !== "HELD") {
    throw new EquipmentIssueServiceError(`เครื่อง ${unit.assetTag} ไม่ได้อยู่ในคลังแล้ว`);
  }

  try {
    await db.$transaction([
      // Status in the filter: if someone just handed this device over, nothing is written.
      db.equipmentUnit.update({ where: { id: unitId, status: unit.status }, data: { status: "IN_REPAIR" } }),
      db.equipmentIssue.create({
        data: {
          equipmentId: unit.equipmentId,
          unitId,
          condition: "BROKEN",
          quantity: 1,
          note: note.trim(),
          reportedByUserId: adminId,
          reportedByName: adminName,
        },
      }),
    ]);
  } catch {
    throw new EquipmentIssueServiceError(`สถานะเครื่อง ${unit.assetTag} เปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่`);
  }
}

/**
 * Close an open issue. REPAIRED puts the units back in the loanable pool;
 * WRITTEN_OFF removes them from the equipment's total quantity for good.
 */
export async function resolveIssue(
  adminId: string,
  adminName: string,
  id: string,
  resolution: Exclude<IssueStatus, "OPEN">,
  note: string
) {
  const issue = await issueModel.findIssueById(id);
  if (!issue) throw new EquipmentIssueServiceError("ไม่พบรายการนี้");
  if (issue.status !== "OPEN") throw new EquipmentIssueServiceError("รายการนี้ถูกดำเนินการไปแล้ว");

  const closeIssue = db.equipmentIssue.update({
    // Status in the filter makes a concurrent resolve fail instead of applying twice.
    where: { id, status: "OPEN" },
    data: {
      status: resolution,
      resolvedAt: new Date(),
      resolvedByUserId: adminId,
      resolvedByName: adminName,
      resolutionNote: note.trim() || null,
    },
  });

  try {
    if (issue.unitId) {
      // Asset-tracked: the specific device goes back into service or is retired.
      await db.$transaction([
        closeIssue,
        db.equipmentUnit.update({
          where: { id: issue.unitId },
          data: { status: resolution === "REPAIRED" ? "AVAILABLE" : "RETIRED" },
        }),
      ]);
      if (resolution === "WRITTEN_OFF") await syncTrackedQuantity(issue.equipmentId);
    } else if (resolution === "WRITTEN_OFF") {
      await db.$transaction([
        closeIssue,
        db.equipment.update({
          where: { id: issue.equipmentId },
          data: { quantity: Math.max(0, issue.equipment.quantity - issue.quantity) },
        }),
      ]);
    } else {
      await closeIssue;
    }
  } catch {
    throw new EquipmentIssueServiceError("รายการนี้ถูกดำเนินการไปแล้ว กรุณาโหลดหน้าใหม่");
  }
}
