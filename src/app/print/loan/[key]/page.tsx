import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { returnConditionLabel } from "@/lib/return-condition";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "ใบยืม-คืนอุปกรณ์ - LendIT" };

/** A4 handover slip for one request (key = requestGroupId, or the loan id for single-line requests). */
export default async function LoanSlipPage({ params }: { params: { key: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" || !session.user.active) redirect("/");

  const isObjectId = /^[a-f0-9]{24}$/i.test(params.key);
  const loans = await db.loan.findMany({
    where: { OR: [{ requestGroupId: params.key }, ...(isObjectId ? [{ id: params.key }] : [])] },
    orderBy: { createdAt: "asc" },
    include: {
      equipment: { select: { name: true, code: true } },
      user: { select: { name: true, employeeId: true, phone: true, department: { select: { name: true } } } },
    },
  });
  if (loans.length === 0) notFound();

  const units = new Map(
    (await db.equipmentUnit.findMany({ where: { id: { in: loans.flatMap((l) => l.unitIds) } }, select: { id: true, assetTag: true, serialNumber: true } })).map(
      (u) => [u.id, u]
    )
  );
  const first = loans[0];
  // One row per handed-over device, or per line for stock-count items.
  const rows = loans.flatMap((loan) =>
    loan.unitIds.length > 0
      ? loan.unitIds.map((unitId) => {
          const unit = units.get(unitId);
          const returned = loan.unitReturns.find((r) => r.unitId === unitId);
          return { name: loan.equipment?.name ?? "-", tag: unit?.assetTag ?? "-", serial: unit?.serialNumber ?? "-", qty: 1, returned: returned?.condition, note: returned?.note };
        })
      : [{ name: loan.equipment?.name ?? "-", tag: loan.equipment?.code ?? "-", serial: "-", qty: loan.quantity, returned: loan.returnCondition ?? undefined, note: loan.returnNote }]
  );
  const isReturned = first.status === "RETURNED";
  const docNo = (first.requestGroupId ?? first.id).slice(-8).toUpperCase();

  const info = [
    ["ผู้ยืม", first.user?.name ?? "-"],
    ["รหัสพนักงาน", first.user?.employeeId ?? "-"],
    ["แผนก", first.user?.department.name ?? "-"],
    ["เบอร์ภายใน", first.requesterPhone || first.user?.phone || "-"],
    ["วันที่ยื่นคำขอ", formatDate(first.createdAt)],
    ["อนุมัติโดย", first.approvedByName ? `${first.approvedByName}${first.approvedAt ? ` · ${formatDate(first.approvedAt)}` : ""}` : "-"],
    ["กำหนดคืน", `${formatDate(first.dueDate)}${first.originalDueDate ? ` (ขยายจาก ${formatDate(first.originalDueDate)})` : ""}`],
    ["วันที่คืน", isReturned && first.returnDate ? `${formatDate(first.returnDate)}${first.returnedByName ? ` · รับคืนโดย ${first.returnedByName}` : ""}` : "-"],
  ];

  return (
    <div className="min-h-screen bg-muted/40 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500">LendIT · ระบบยืมอุปกรณ์ IT</p>
            <h1 className="mt-1 text-2xl font-bold">ใบยืม-คืนอุปกรณ์</h1>
          </div>
          <div className="text-right text-xs">
            <p>
              เลขที่ <span className="font-mono text-sm font-semibold">{docNo}</span>
            </p>
            <p className="mt-0.5 text-slate-500">พิมพ์เมื่อ {formatDate(new Date())}</p>
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="flex gap-2 border-b border-dotted border-slate-300 pb-1">
              <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3">
          <span className="text-slate-500">วัตถุประสงค์: </span>
          {first.purpose}
        </p>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left">
              {["ลำดับ", "อุปกรณ์", "รหัสครุภัณฑ์", "Serial Number", "จำนวน", "สภาพตอนคืน"].map((h) => (
                <th key={h} className="border border-slate-300 px-2 py-1.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border border-slate-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5">{row.name}</td>
                <td className="border border-slate-300 px-2 py-1.5 font-mono">{row.tag}</td>
                <td className="border border-slate-300 px-2 py-1.5 font-mono">{row.serial}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-center">{row.qty}</td>
                <td className="border border-slate-300 px-2 py-1.5">
                  {row.returned ? `${returnConditionLabel(row.returned)}${row.note ? ` (${row.note})` : ""}` : "☐ ปกติ  ☐ ชำรุด  ☐ เสีย"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-xs text-slate-600">
          ข้าพเจ้าได้รับอุปกรณ์ตามรายการข้างต้น ได้ตรวจสอบสภาพแล้ว และจะส่งคืนภายในวันกำหนดคืน
        </p>

        <section className="mt-12 grid grid-cols-3 gap-6 text-center text-xs">
          {[
            { role: "ผู้ยืม", name: first.user?.name },
            { role: "ผู้ส่งมอบ (เจ้าหน้าที่ IT)", name: first.approvedByName },
            { role: "ผู้รับคืน (เจ้าหน้าที่ IT)", name: isReturned ? first.returnedByName : null },
          ].map((sig) => (
            <div key={sig.role}>
              <p className="border-b border-slate-400 pb-1">&nbsp;</p>
              <p className="mt-1">({sig.name || "....................................."})</p>
              <p className="mt-1 font-medium">{sig.role}</p>
              <p className="mt-2 text-slate-500">วันที่ ........./........./.........</p>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
