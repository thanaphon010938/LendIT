import Link from "next/link";
import { Plus } from "lucide-react";
import * as loanService from "@/services/loan.service";
import * as unitModel from "@/models/equipment-unit.model";
import { AdminLoansManager } from "@/components/loan/admin-loans-manager";
import type { ApprovableUnit } from "@/components/loan/approve-loan-button";

export default async function AdminLoansPage({ searchParams }: { searchParams: { tab?: string; approve?: string } }) {
  const loans = await loanService.listLoans();

  // Devices an admin can hand over when approving pending requests for asset-tracked equipment.
  const pendingTrackedIds = Array.from(
    new Set(loans.filter((l) => l.status === "PENDING" && l.equipment?.trackUnits).map((l) => l.equipment!.id))
  );
  const availableUnits: Record<string, ApprovableUnit[]> = {};
  for (const unit of await unitModel.findAvailableUnits(pendingTrackedIds)) {
    (availableUnits[unit.equipmentId] ??= []).push({ id: unit.id, assetTag: unit.assetTag, serialNumber: unit.serialNumber });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการคำขอยืม-คืน</h1>
          <p className="mt-1 text-muted-foreground">อนุมัติ ปฏิเสธ หรือบันทึกการคืนอุปกรณ์</p>
        </div>
        <Link
          href="/admin/loans/new"
          className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
          ยืมแทนผู้ใช้
        </Link>
      </div>

      <AdminLoansManager
        loans={loans}
        initialTab={searchParams.tab}
        availableUnits={availableUnits}
        autoApproveKey={searchParams.approve}
      />
    </div>
  );
}
