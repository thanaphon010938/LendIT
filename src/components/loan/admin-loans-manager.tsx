"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { LoanStatus, ReturnCondition } from "@prisma/client";
import { Search, ChevronLeft, ChevronRight, ClipboardList, Printer } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter, isInDateRange, type DateRange } from "@/components/loan/date-range-filter";
import { LoanActionButton } from "@/components/loan/loan-action-button";
import { ReturnLoanButton } from "@/components/loan/return-loan-button";
import { ExtensionNote } from "@/components/loan/extend-loan-button";
import { ReviewExtension } from "@/components/loan/review-extension";
import { ApproveLoanButton, type ApprovableUnit } from "@/components/loan/approve-loan-button";
import type { LoanUnit } from "@/services/loan.service";
import { returnConditionBadgeClass, returnConditionLabel } from "@/lib/return-condition";
import { formatDate, cn } from "@/lib/utils";
import { getCategoryColor, getEquipmentIcon } from "@/lib/equipment-icon";

type AdminLoan = {
  id: string;
  requestGroupId: string | null;
  requesterPhone: string | null;
  rejectionReason: string | null;
  approvedByUserId: string | null;
  approvedByName: string | null;
  rejectedByUserId: string | null;
  rejectedByName: string | null;
  approvedAt: Date | null;
  approvalRevokedAt: Date | null;
  approvalRevokedByName: string | null;
  approvalRevokeReason: string | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  borrowDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  createdAt: Date;
  status: LoanStatus;
  quantity: number;
  purpose: string;
  approvedBy: { id: string; name: string } | null;
  returnedByUserId: string | null;
  returnedByName: string | null;
  returnCondition: ReturnCondition | null;
  returnNote: string | null;
  createdByAdminName: string | null;
  extensionStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  extensionRequestedDueDate: Date | null;
  extensionReason: string | null;
  extensionRejectReason: string | null;
  extensionReviewedByName: string | null;
  originalDueDate: Date | null;
  units: LoanUnit[];
  equipment: {
    id: string;
    name: string;
    code: string;
    trackUnits: boolean;
    category: { name: string } | null;
  } | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    department: { id: string; code: string; name: string };
  } | null;
};

type LoanGroup = {
  key: string;
  loans: AdminLoan[];
  status: LoanStatus;
  createdAt: Date;
  dueDate: Date;
  user: AdminLoan["user"];
  purpose: string;
  requesterPhone: string | null;
};

const tabs: { id: "ALL" | "OVERDUE" | "EXTENSION" | LoanStatus; label: string }[] = [
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "กำลังยืม" },
  { id: "EXTENSION", label: "ขอขยายเวลา" },
  { id: "OVERDUE", label: "เกินกำหนด" },
  { id: "RETURNED", label: "คืนแล้ว" },
  { id: "REJECTED", label: "ปฏิเสธ" },
  { id: "CANCELLED", label: "ยกเลิก" },
  { id: "ALL", label: "ทั้งหมด" },
];

const pageSize = 10;

function isOverdue(group: LoanGroup) {
  return group.status === "APPROVED" && new Date(group.dueDate).getTime() < Date.now();
}

function matchesTab(group: LoanGroup, tab: (typeof tabs)[number]["id"]) {
  if (tab === "ALL") return true;
  if (tab === "OVERDUE") return isOverdue(group);
  if (tab === "EXTENSION") return group.status === "APPROVED" && group.loans[0].extensionStatus === "PENDING";
  return group.status === tab;
}

export function AdminLoansManager({
  loans,
  initialTab,
  availableUnits,
  autoApproveKey,
}: {
  loans: AdminLoan[];
  initialTab?: string;
  /** AVAILABLE devices per equipment id, offered when approving asset-tracked lines. */
  availableUnits: Record<string, ApprovableUnit[]>;
  /** Request to open the approval dialog for on load (right after an admin filed it at the counter). */
  autoApproveKey?: string;
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    () => tabs.find((tab) => tab.id === initialTab)?.id ?? "PENDING"
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const groups = useMemo(() => {
    const grouped = new Map<string, AdminLoan[]>();
    for (const loan of loans) {
      const key = loan.requestGroupId || loan.id;
      const entries = grouped.get(key) ?? [];
      entries.push(loan);
      grouped.set(key, entries);
    }

    return Array.from(grouped.entries())
      .map(([key, entries]): LoanGroup => {
        const first = entries[0];
        return {
          key,
          loans: entries,
          status: first.status,
          createdAt: first.createdAt,
          dueDate: first.dueDate,
          user: first.user,
          purpose: first.purpose,
          requesterPhone: first.requesterPhone,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans]);

  const datedGroups = useMemo(
    () => groups.filter((group) => isInDateRange(group.loans[0].borrowDate, dateRange)),
    [dateRange, groups]
  );

  const filteredGroups = useMemo(() => {
    return datedGroups.filter((group) => {
      if (!matchesTab(group, activeTab)) return false;
      if (!deferredSearch) return true;

      const searchable = [
        group.user?.name ?? "บัญชีผู้ยืมไม่พบ",
        group.user?.email ?? "",
        group.user?.department.name ?? "",
        group.requesterPhone,
        group.purpose,
        ...group.loans.flatMap((loan) => [loan.equipment?.name, loan.equipment?.code]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(deferredSearch);
    });
  }, [activeTab, deferredSearch, datedGroups]);

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const visibleGroups = filteredGroups.slice((page - 1) * pageSize, page * pageSize);

  function selectTab(tab: (typeof tabs)[number]["id"]) {
    setActiveTab(tab);
    setPage(1);
  }

  function updateDateRange(value: DateRange) {
    setDateRange(value);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="ค้นหาผู้ยืม อุปกรณ์ รหัส หรือแผนก"
            aria-label="ค้นหารายการยืม"
            className="pl-9"
          />
        </div>
          <DateRangeFilter value={dateRange} onChange={updateDateRange} />
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="กรองตามสถานะ">
          {tabs.map((tab) => {
            const count = datedGroups.filter((group) => matchesTab(group, tab.id)).length;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-xs tabular-nums", active ? "bg-white/15" : "bg-muted")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={deferredSearch || dateRange.from || dateRange.to ? "ไม่พบรายการที่ค้นหา" : activeTab === "PENDING" ? "ไม่มีคำขอรออนุมัติ" : "ไม่พบรายการในสถานะนี้"}
          description={deferredSearch ? "ลองค้นหาด้วยชื่อผู้ยืม ชื่ออุปกรณ์ หรือแผนก" : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleGroups.map((group) => {
            const overdue = isOverdue(group);
            const ids = group.loans.map((loan) => loan.id);
            const itemSummary = group.loans.map(
              (loan) => `${loan.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ"} (${loan.equipment?.code ?? "-"}) · ${loan.quantity} ชิ้น`
            );
            const firstEquipment = group.loans[0]?.equipment;
            const firstCategoryName = firstEquipment?.category?.name ?? "";
            const FirstIcon = getEquipmentIcon(firstCategoryName);

            return (
              <Card key={group.key} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", getCategoryColor(firstCategoryName))}>
                      <FirstIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Avatar name={group.user?.name ?? "บัญชีผู้ยืมไม่พบ"} size="sm" />
                        <p className="font-medium">{group.user?.name ?? "บัญชีผู้ยืมไม่พบ"}</p>
                        {group.user?.email && (
                          <span className="text-xs text-muted-foreground">{group.user.email}</span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {group.loans.map((loan) => (
                          <div key={loan.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className="font-medium">{loan.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ"}</span>
                            <span className="font-mono text-xs text-muted-foreground">{loan.equipment?.code ?? "-"}</span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{loan.quantity} ชิ้น</span>
                            {loan.returnCondition && (
                              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", returnConditionBadgeClass[loan.returnCondition])}>
                                คืนสภาพ{returnConditionLabel(loan.returnCondition)}
                              </span>
                            )}
                            {loan.units.length === 0 && loan.returnNote && <span className="text-xs text-muted-foreground">· {loan.returnNote}</span>}
                            {loan.units.length > 0 && (
                              <div className="flex w-full flex-wrap gap-1.5 pl-0.5">
                                {loan.units.map((unit) => (
                                  <span
                                    key={unit.id}
                                    title={unit.serialNumber ? `S/N ${unit.serialNumber}` : undefined}
                                    className={cn(
                                      "rounded-md px-2 py-0.5 font-mono text-xs ring-1 ring-inset",
                                      unit.returnCondition && unit.returnCondition !== "NORMAL"
                                        ? returnConditionBadgeClass[unit.returnCondition]
                                        : "bg-muted/60 text-foreground/80 ring-border"
                                    )}
                                  >
                                    {unit.assetTag}
                                    {unit.returnCondition && unit.returnCondition !== "NORMAL" && (
                                      <span className="font-sans">
                                        {" "}· {returnConditionLabel(unit.returnCondition)}
                                        {unit.returnNote && ` (${unit.returnNote})`}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {group.user?.department.name ?? ""}
                        {(group.requesterPhone || group.user?.phone) && ` · เบอร์ภายใน ${group.requesterPhone || group.user?.phone}`}
                        {` · ยื่นคำขอ ${formatDate(group.createdAt)}`}
                        {` · กำหนดคืน ${formatDate(group.dueDate)}`}
                        {overdue && <span className="font-semibold text-rose-600"> · เกินกำหนด</span>}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">วัตถุประสงค์: {group.purpose}</p>
                      {group.loans[0].createdByAdminName && (
                        <p className="mt-1 text-xs text-muted-foreground">ยืมที่เคาน์เตอร์ · สร้างคำขอแทนโดย {group.loans[0].createdByAdminName}</p>
                      )}

                      {group.status === "APPROVED" && (group.loans[0].approvedByName || group.loans[0].approvedBy) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          อนุมัติโดย {group.loans[0].approvedByName ?? group.loans[0].approvedBy?.name}
                          {group.loans[0].approvedAt && ` · ${formatDate(group.loans[0].approvedAt)}`}
                        </p>
                      )}
                      {group.loans[0].approvalRevokedAt && (
                        <p className="mt-1 text-xs text-amber-700">
                          เคยยกเลิกการอนุมัติโดย {group.loans[0].approvalRevokedByName ?? "ผู้ดูแลระบบ"}
                          {` · ${formatDate(group.loans[0].approvalRevokedAt)}`}
                          {group.loans[0].approvalRevokeReason && ` · เหตุผล: ${group.loans[0].approvalRevokeReason}`}
                        </p>
                      )}
                      {(group.status === "APPROVED" || group.status === "RETURNED") && (
                        <ExtensionNote loan={group.loans[0]} forAdmin />
                      )}
                      {group.status === "APPROVED" &&
                        group.loans[0].extensionStatus === "PENDING" &&
                        group.loans[0].extensionRequestedDueDate && (
                          <ReviewExtension
                            loanIds={ids}
                            currentDueDate={group.dueDate}
                            requestedDueDate={group.loans[0].extensionRequestedDueDate}
                            reason={group.loans[0].extensionReason}
                          />
                        )}
                      {group.status === "REJECTED" && (
                        <p className="mt-1 text-xs text-rose-700">
                          ปฏิเสธโดย {group.loans[0].rejectedByName ?? "ผู้ดูแลระบบ"}
                          {group.loans[0].rejectedAt && ` · ${formatDate(group.loans[0].rejectedAt)}`}
                          {group.loans[0].rejectionReason && ` · เหตุผล: ${group.loans[0].rejectionReason}`}
                        </p>
                      )}
                      {group.status === "CANCELLED" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ผู้ยืมยกเลิกคำขอ{group.loans[0].cancelledAt && ` · ${formatDate(group.loans[0].cancelledAt)}`}
                        </p>
                      )}
                      {group.status === "RETURNED" && group.loans[0].returnDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          คืนแล้ว {formatDate(group.loans[0].returnDate)}
                          {group.loans[0].returnedByName && ` · รับคืนโดย ${group.loans[0].returnedByName}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <LoanStatusBadge status={group.status} />
                    {(group.status === "APPROVED" || group.status === "RETURNED") && (
                      <a
                        href={`/print/loan/${group.key}`}
                        target="_blank"
                        rel="noopener"
                        title="พิมพ์ใบยืม-คืนสำหรับเซ็นรับ"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Printer className="h-4 w-4" />
                        ใบยืม
                      </a>
                    )}
                    {group.status === "PENDING" && (
                      <>
                        <ApproveLoanButton
                          defaultOpen={group.key === autoApproveKey}
                          borrowerName={group.user?.name ?? "บัญชีผู้ยืมไม่พบ"}
                          lines={group.loans.map((loan) => ({
                            loanId: loan.id,
                            name: loan.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ",
                            code: loan.equipment?.code ?? "-",
                            quantity: loan.quantity,
                            trackUnits: loan.equipment?.trackUnits ?? false,
                            availableUnits: (loan.equipment && availableUnits[loan.equipment.id]) ?? [],
                          }))}
                        />
                        <LoanActionButton
                          loanIds={ids}
                          itemSummary={itemSummary}
                          borrowerName={group.user?.name ?? "บัญชีผู้ยืมไม่พบ"}
                          itemCount={group.loans.length}
                          kind="reject"
                          variant="outline"
                        />
                      </>
                    )}
                    {group.status === "APPROVED" && (
                      <>
                        <LoanActionButton
                          loanIds={ids}
                          itemSummary={itemSummary}
                          borrowerName={group.user?.name ?? "บัญชีผู้ยืมไม่พบ"}
                          itemCount={group.loans.length}
                          kind="revoke"
                          variant="outline"
                        />
                        <ReturnLoanButton
                          borrowerName={group.user?.name ?? "บัญชีผู้ยืมไม่พบ"}
                          items={group.loans.map((loan) => ({
                            id: loan.id,
                            name: loan.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ",
                            code: loan.equipment?.code ?? "-",
                            quantity: loan.quantity,
                            units: loan.units,
                          }))}
                        />
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {filteredGroups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <p className="text-muted-foreground">
            แสดง {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredGroups.length)} จาก {filteredGroups.length} คำขอ
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="หน้าก่อนหน้า"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">หน้า {page} / {pageCount}</span>
            <button
              type="button"
              aria-label="หน้าถัดไป"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}