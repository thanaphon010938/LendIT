"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { LoanStatus, ReturnCondition } from "@prisma/client";
import { returnConditionBadgeClass, returnConditionLabel } from "@/lib/return-condition";
import { Search, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter, isInDateRange, type DateRange } from "@/components/loan/date-range-filter";
import { CancelLoanButton } from "@/components/loan/cancel-loan-button";
import { ExtendLoanButton, ExtensionNote } from "@/components/loan/extend-loan-button";
import { formatDate, cn } from "@/lib/utils";
import { getCategoryColor, getEquipmentIcon } from "@/lib/equipment-icon";

type MyLoan = {
  id: string;
  requestGroupId: string | null;
  rejectionReason: string | null;
  borrowDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  returnCondition: ReturnCondition | null;
  returnNote: string | null;
  units: { id: string; assetTag: string }[];
  extensionStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  extensionRequestedDueDate: Date | null;
  extensionReason: string | null;
  extensionRejectReason: string | null;
  extensionReviewedByName: string | null;
  originalDueDate: Date | null;
  createdAt: Date;
  status: LoanStatus;
  quantity: number;
  purpose: string;
  equipment: {
    name: string;
    code: string;
    category: { name: string } | null;
  } | null;
};

type LoanGroup = {
  key: string;
  loans: MyLoan[];
  status: LoanStatus;
  createdAt: Date;
  dueDate: Date;
};

const tabs: { id: "ALL" | "OVERDUE" | LoanStatus; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "กำลังยืม" },
  { id: "OVERDUE", label: "เกินกำหนด" },
  { id: "RETURNED", label: "คืนแล้ว" },
  { id: "REJECTED", label: "ปฏิเสธ" },
  { id: "CANCELLED", label: "ยกเลิก" },
];

const pageSize = 10;

function isOverdue(group: LoanGroup) {
  return group.status === "APPROVED" && new Date(group.dueDate).getTime() < Date.now();
}

function matchesTab(group: LoanGroup, tab: (typeof tabs)[number]["id"]) {
  if (tab === "ALL") return true;
  if (tab === "OVERDUE") return isOverdue(group);
  return group.status === tab;
}

export function MyLoansManager({ loans, initialTab }: { loans: MyLoan[]; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    () => tabs.find((tab) => tab.id === initialTab)?.id ?? "ALL"
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const groups = useMemo(() => {
    const grouped = new Map<string, MyLoan[]>();
    for (const loan of loans) {
      const key = loan.requestGroupId || loan.id;
      const entries = grouped.get(key) ?? [];
      entries.push(loan);
      grouped.set(key, entries);
    }

    return Array.from(grouped.entries())
      .map(([key, entries]): LoanGroup => ({
        key,
        loans: entries,
        status: entries[0].status,
        createdAt: entries[0].createdAt,
        dueDate: entries[0].dueDate,
      }))
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
        group.loans[0].purpose,
        ...group.loans.flatMap((loan) => [loan.equipment?.name, loan.equipment?.code, loan.equipment?.category?.name]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(deferredSearch);
    });
  }, [activeTab, deferredSearch, datedGroups]);

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleGroups = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            placeholder="ค้นหาชื่ออุปกรณ์ รหัส หรือวัตถุประสงค์"
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
          title={deferredSearch || dateRange.from || dateRange.to ? "ไม่พบรายการที่ค้นหา" : "ไม่พบรายการในสถานะนี้"}
          description={deferredSearch ? "ลองค้นหาด้วยชื่ออุปกรณ์ รหัส หรือวัตถุประสงค์" : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleGroups.map(({ key, loans: items }) => {
            const loan = items[0];
            const categoryName = loan.equipment?.category?.name ?? "";
            const Icon = getEquipmentIcon(categoryName);
            const overdue = loan.status === "APPROVED" && new Date(loan.dueDate) < new Date();
            const itemSummary = items.map(
              (item) => `${item.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ"} (${item.equipment?.code ?? "-"}) · ${item.quantity} ชิ้น`
            );
            return (
              <Card key={key}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", getCategoryColor(categoryName))}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <p key={item.id} className="font-medium">
                            {item.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ"}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {item.units.length > 0 ? item.units.map((unit) => unit.assetTag).join(", ") : item.equipment?.code} · {item.quantity} ชิ้น
                            </span>
                            {item.returnCondition && item.returnCondition !== "NORMAL" && (
                              <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", returnConditionBadgeClass[item.returnCondition])}>
                                คืนสภาพ{returnConditionLabel(item.returnCondition)}
                                {item.returnNote && ` · ${item.returnNote}`}
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ยืม {formatDate(loan.borrowDate)} ·{" "}
                        {overdue ? (
                          <span className="font-medium text-rose-600">เลยกำหนดคืน {formatDate(loan.dueDate)}</span>
                        ) : (
                          `กำหนดคืน ${formatDate(loan.dueDate)}`
                        )}
                        {loan.returnDate && ` · คืนแล้ว ${formatDate(loan.returnDate)}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">วัตถุประสงค์: {loan.purpose}</p>
                      {loan.status === "REJECTED" && loan.rejectionReason && (
                        <p className="mt-1 text-xs text-rose-700">เหตุผลที่ปฏิเสธ: {loan.rejectionReason}</p>
                      )}
                      {(loan.status === "APPROVED" || loan.status === "RETURNED") && <ExtensionNote loan={loan} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LoanStatusBadge status={loan.status} />
                    {loan.status === "PENDING" && <CancelLoanButton loanIds={items.map((item) => item.id)} itemSummary={itemSummary} />}
                    {loan.status === "APPROVED" && loan.extensionStatus !== "PENDING" && (
                      <ExtendLoanButton loanIds={items.map((item) => item.id)} currentDueDate={loan.dueDate} itemSummary={itemSummary} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredGroups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <p className="text-muted-foreground">
            แสดง {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredGroups.length)} จาก {filteredGroups.length} คำขอ
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="หน้าก่อนหน้า"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">หน้า {currentPage} / {pageCount}</span>
            <button
              type="button"
              aria-label="หน้าถัดไป"
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
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
