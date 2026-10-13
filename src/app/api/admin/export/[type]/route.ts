import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportAuditLogs, logAudit } from "@/services/audit.service";
import { returnConditionLabel } from "@/lib/return-condition";

/**
 * CSV exports for the reports page. UTF-8 with BOM so Excel shows Thai correctly; dates are
 * YYYY-MM-DD so Excel / Power BI read them as dates. Admin only.
 */

const STATUS: Record<string, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "กำลังยืม",
  RETURNED: "คืนแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
};
const UNIT_STATUS: Record<string, string> = {
  AVAILABLE: "ว่าง",
  HELD: "เก็บไว้ ไม่ให้ยืม",
  ON_LOAN: "ถูกยืม",
  IN_REPAIR: "รอซ่อม",
  LOST: "สูญหาย",
  RETIRED: "ปลดระวาง",
};
const ISSUE_STATUS: Record<string, string> = { OPEN: "รอดำเนินการ", REPAIRED: "ซ่อมเสร็จ", WRITTEN_OFF: "ตัดจำหน่าย" };

const day = (date: Date | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Inclusive date range from ?from=YYYY-MM-DD&to=YYYY-MM-DD (either optional). */
function dateRange(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const range: { gte?: Date; lt?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) range.gte = new Date(`${from}T00:00:00`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    range.lt = end;
  }
  return Object.keys(range).length > 0 ? range : undefined;
}

async function loansCsv(request: NextRequest) {
  const loans = await db.loan.findMany({
    where: { createdAt: dateRange(request) },
    orderBy: { createdAt: "desc" },
    include: {
      equipment: { select: { code: true, name: true, category: { select: { name: true } } } },
      user: { select: { name: true, employeeId: true, department: { select: { name: true } } } },
    },
  });
  const units = new Map(
    (await db.equipmentUnit.findMany({ where: { id: { in: loans.flatMap((l) => l.unitIds) } }, select: { id: true, assetTag: true, serialNumber: true } })).map(
      (u) => [u.id, u]
    )
  );
  const today = Date.now();
  return toCsv(
    ["เลขคำขอ", "วันที่ยื่นคำขอ", "ผู้ยืม", "รหัสพนักงาน", "แผนก", "อุปกรณ์", "รหัสรุ่น", "ประเภท", "จำนวน", "รหัสครุภัณฑ์", "Serial Number", "สถานะ", "วันที่อนุมัติ", "ผู้อนุมัติ", "กำหนดคืน", "กำหนดคืนเดิม (ก่อนขยาย)", "วันที่คืน", "ผู้รับคืน", "สภาพตอนคืน", "หมายเหตุสภาพ", "เลยกำหนด (วัน)", "เหตุผลที่ปฏิเสธ", "วัตถุประสงค์", "สร้างแทนโดยแอดมิน"],
    loans.map((loan) => {
      const lineUnits = loan.unitIds.map((id) => units.get(id)).filter(Boolean);
      const end = loan.returnDate ? new Date(loan.returnDate).getTime() : loan.status === "APPROVED" ? today : null;
      const lateDays = end ? Math.max(0, Math.floor((end - new Date(loan.dueDate).getTime()) / 86_400_000)) : 0;
      return [
        (loan.requestGroupId ?? loan.id).slice(-8).toUpperCase(),
        day(loan.createdAt),
        loan.user?.name,
        loan.user?.employeeId,
        loan.user?.department.name,
        loan.equipment?.name,
        loan.equipment?.code,
        loan.equipment?.category.name,
        loan.quantity,
        lineUnits.map((u) => u!.assetTag).join(" "),
        lineUnits.map((u) => u!.serialNumber ?? "").join(" "),
        STATUS[loan.status] ?? loan.status,
        day(loan.approvedAt),
        loan.approvedByName,
        day(loan.dueDate),
        day(loan.originalDueDate),
        day(loan.returnDate),
        loan.returnedByName,
        loan.returnCondition ? returnConditionLabel(loan.returnCondition) : "",
        loan.returnNote,
        lateDays || "",
        loan.rejectionReason,
        loan.purpose,
        loan.createdByAdminName,
      ];
    })
  );
}

async function unitsCsv() {
  const units = await db.equipmentUnit.findMany({
    orderBy: { assetTag: "asc" },
    include: { equipment: { select: { code: true, name: true, category: { select: { name: true } } } } },
  });
  const ids = units.map((u) => u.id);
  const loans = await db.loan.findMany({
    where: { unitIds: { hasSome: ids } },
    select: { unitIds: true, status: true, dueDate: true, user: { select: { name: true } } },
  });
  return toCsv(
    ["รหัสครุภัณฑ์", "Serial Number", "อุปกรณ์", "รหัสรุ่น", "ประเภท", "สถานะเครื่อง", "ผู้ถือปัจจุบัน", "กำหนดคืน", "ถูกยืมแล้ว (ครั้ง)", "หมายเหตุ", "วันที่เพิ่มเข้าระบบ"],
    units.map((unit) => {
      const own = loans.filter((l) => l.unitIds.includes(unit.id));
      const current = own.find((l) => l.status === "APPROVED");
      return [
        unit.assetTag,
        unit.serialNumber,
        unit.equipment.name,
        unit.equipment.code,
        unit.equipment.category.name,
        UNIT_STATUS[unit.status] ?? unit.status,
        current?.user?.name,
        day(current?.dueDate),
        own.length,
        unit.note,
        day(unit.createdAt),
      ];
    })
  );
}

async function issuesCsv(request: NextRequest) {
  const issues = await db.equipmentIssue.findMany({
    where: { createdAt: dateRange(request) },
    orderBy: { createdAt: "desc" },
    include: { equipment: { select: { code: true, name: true } }, unit: { select: { assetTag: true, serialNumber: true } } },
  });
  return toCsv(
    ["วันที่แจ้ง", "อุปกรณ์", "รหัสรุ่น", "รหัสครุภัณฑ์", "Serial Number", "สภาพ", "จำนวน", "อาการ", "แจ้งโดย", "สถานะ", "วันที่ดำเนินการ", "ดำเนินการโดย", "หมายเหตุการดำเนินการ"],
    issues.map((issue) => [
      day(issue.createdAt),
      issue.equipment.name,
      issue.equipment.code,
      issue.unit?.assetTag,
      issue.unit?.serialNumber,
      returnConditionLabel(issue.condition),
      issue.quantity,
      issue.note,
      issue.reportedByName,
      ISSUE_STATUS[issue.status] ?? issue.status,
      day(issue.resolvedAt),
      issue.resolvedByName,
      issue.resolutionNote,
    ])
  );
}

async function usersCsv() {
  const users = await db.user.findMany({
    where: { approvalStatus: "APPROVED" },
    orderBy: { name: "asc" },
    select: { id: true, employeeId: true, name: true, role: true, isActive: true, phone: true, createdAt: true, department: { select: { name: true } } },
  });
  const loans = await db.loan.findMany({ select: { userId: true, status: true, requestGroupId: true, id: true } });
  return toCsv(
    ["รหัสพนักงาน", "ชื่อ", "แผนก", "สิทธิ์", "สถานะบัญชี", "เบอร์ภายใน", "วันที่สมัคร", "จำนวนคำขอทั้งหมด", "กำลังยืมอยู่ (คำขอ)"],
    users.map((user) => {
      const own = loans.filter((l) => l.userId === user.id);
      const requests = new Set(own.map((l) => l.requestGroupId ?? l.id));
      const active = new Set(own.filter((l) => l.status === "APPROVED").map((l) => l.requestGroupId ?? l.id));
      return [
        user.employeeId,
        user.name,
        user.department.name,
        user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน",
        user.isActive === false ? "ถูกระงับ" : "ใช้งานได้",
        user.phone,
        day(user.createdAt),
        requests.size,
        active.size,
      ];
    })
  );
}

async function auditCsv(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const logs = await exportAuditLogs({
    group: p.get("group") ?? undefined,
    search: p.get("q") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
  });
  const time = (d: Date) => new Date(d).toTimeString().slice(0, 8);
  return toCsv(
    ["วันที่", "เวลา", "ผู้ดำเนินการ", "รหัสการกระทำ", "รายละเอียด", "ประเภทข้อมูล", "รหัสข้อมูล"],
    logs.map((log) => [day(log.createdAt), time(log.createdAt), log.actorName, log.action, log.summary, log.targetType, log.targetId])
  );
}

const EXPORTS = {
  loans: { label: "รายการยืม-คืน", build: loansCsv },
  units: { label: "ทะเบียนครุภัณฑ์รายเครื่อง", build: unitsCsv },
  issues: { label: "รายการซ่อม", build: issuesCsv },
  users: { label: "รายชื่อผู้ใช้งาน", build: usersCsv },
  audit: { label: "ประวัติการทำงาน", build: auditCsv },
} as const;

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.active) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const spec = EXPORTS[params.type as keyof typeof EXPORTS];
  if (!spec) return NextResponse.json({ error: "unknown export" }, { status: 404 });

  const csv = await spec.build(request);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  await logAudit(session.user, `export.${params.type}`, `ส่งออกข้อมูล ${spec.label}${from || to ? ` (${from ?? "เริ่มต้น"} ถึง ${to ?? "ปัจจุบัน"})` : ""}`);

  const filename = `lendit-${params.type}-${day(new Date())}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
