import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { notSuspended } from "@/models/user.model";
import * as equipmentService from "@/services/equipment.service";
import { AdminLoanForm } from "@/components/loan/admin-loan-form";

export default async function AdminNewLoanPage() {
  const [users, equipment] = await Promise.all([
    db.user.findMany({
      where: { approvalStatus: "APPROVED", ...notSuspended },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeId: true, phone: true, department: { select: { name: true } } },
    }),
    equipmentService.listLoanableEquipment(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/loans" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        กลับไปคำขอยืม-คืน
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ยืมแทนผู้ใช้</h1>
        <p className="mt-1 text-muted-foreground">สำหรับผู้ยืมที่มาขอที่เคาน์เตอร์ IT สร้างคำขอแล้วเลือกเครื่องส่งมอบได้ทันที</p>
      </div>
      <AdminLoanForm
        users={users.map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId, phone: u.phone, department: u.department.name }))}
        equipment={equipment.map((e) => ({ id: e.id, name: e.name, code: e.code, category: e.category.name, available: e.availableQuantity }))}
      />
    </div>
  );
}
