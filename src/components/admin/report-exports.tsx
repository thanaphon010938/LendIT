"use client";

import { useState } from "react";
import { ClipboardList, Download, PackageSearch, UsersRound, Wrench, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Report = { type: string; title: string; description: string; icon: LucideIcon; iconClass: string; dated: boolean };

const REPORTS: Report[] = [
  {
    type: "loans",
    title: "รายการยืม-คืน",
    description: "ทุกรายการยืม 1 แถวต่ออุปกรณ์ พร้อมผู้ยืม แผนก รหัสเครื่อง S/N วันอนุมัติ วันคืน สภาพตอนคืน และจำนวนวันที่เลยกำหนด",
    icon: ClipboardList,
    iconClass: "bg-indigo-100 text-indigo-600",
    dated: true,
  },
  {
    type: "units",
    title: "ทะเบียนครุภัณฑ์รายเครื่อง",
    description: "รายเครื่องทั้งหมด รหัสครุภัณฑ์ S/N สถานะปัจจุบัน ผู้ถืออยู่ และจำนวนครั้งที่ถูกยืม ใช้ตรวจนับครุภัณฑ์",
    icon: PackageSearch,
    iconClass: "bg-sky-100 text-sky-600",
    dated: false,
  },
  {
    type: "issues",
    title: "รายการซ่อม",
    description: "เครื่องที่เสียหรือสูญหาย อาการ ผู้แจ้ง และผลการดำเนินการ (ซ่อมเสร็จ / ตัดจำหน่าย)",
    icon: Wrench,
    iconClass: "bg-rose-100 text-rose-600",
    dated: true,
  },
  {
    type: "users",
    title: "รายชื่อผู้ใช้งาน",
    description: "ผู้ใช้ที่อนุมัติแล้ว แผนก สิทธิ์ สถานะบัญชี และจำนวนคำขอยืม",
    icon: UsersRound,
    iconClass: "bg-violet-100 text-violet-600",
    dated: false,
  },
];

export function ReportExports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-from" className="text-sm font-medium">ตั้งแต่วันที่</label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-to" className="text-sm font-medium">ถึงวันที่</label>
            <Input id="report-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-44" />
          </div>
          <p className="pb-2.5 text-xs text-muted-foreground">
            ใช้กับรายงานที่มีวันที่ (ยืม-คืน, ซ่อม) · เว้นว่างไว้ = ทั้งหมด
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.type}>
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", report.iconClass)}>
                  <report.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{report.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {report.dated ? (from || to ? `${from || "เริ่มต้น"} ถึง ${to || "ปัจจุบัน"}` : "ทุกช่วงเวลา") : "ข้อมูลปัจจุบัน"}
                </span>
                <a
                  href={`/api/admin/export/${report.type}${report.dated && query ? `?${query}` : ""}`}
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  ดาวน์โหลด CSV
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
