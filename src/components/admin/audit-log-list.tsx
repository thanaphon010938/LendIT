"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, History, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type AuditLog = { id: string; actorName: string; action: string; summary: string; createdAt: Date };
type Filters = { group: string; q: string; from: string; to: string };

/** Groups by the action key prefix ("loan.approve" -> "loan"). */
const GROUPS: { id: string; label: string; className: string }[] = [
  { id: "loan", label: "การยืม-คืน", className: "bg-indigo-50 text-indigo-700" },
  { id: "equipment", label: "อุปกรณ์", className: "bg-sky-50 text-sky-700" },
  { id: "unit", label: "รายเครื่อง", className: "bg-cyan-50 text-cyan-700" },
  { id: "issue", label: "ซ่อม", className: "bg-rose-50 text-rose-700" },
  { id: "user", label: "ผู้ใช้", className: "bg-violet-50 text-violet-700" },
  { id: "category", label: "ประเภท", className: "bg-amber-50 text-amber-700" },
  { id: "department", label: "แผนก", className: "bg-emerald-50 text-emerald-700" },
  { id: "export", label: "ส่งออกข้อมูล", className: "bg-slate-100 text-slate-700" },
];
const groupOf = (action: string) => GROUPS.find((g) => g.id === action.split(".")[0]);

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Filters live in the URL; the server does the searching and paging over the whole log. */
export function AuditLogList({
  logs,
  total,
  all,
  groupCounts,
  page,
  pageSize,
  filters,
}: {
  logs: AuditLog[];
  total: number;
  all: number;
  groupCounts: Record<string, number>;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  function navigate(next: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    for (const key of ["group", "q", "from", "to"] as const) if (merged[key]) params.set(key, merged[key]);
    // Any filter change starts again from page 1.
    const targetPage = next.page ?? 1;
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => navigate({ q: search.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasDateFilter = Boolean(filters.from || filters.to);
  const exportParams = new URLSearchParams(
    Object.entries({ group: filters.group, q: filters.q, from: filters.from, to: filters.to }).filter(([, v]) => v)
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[16rem] flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา เช่น ชื่อผู้ยืม, รหัสเครื่อง, ชื่อแอดมิน"
            aria-label="ค้นหาประวัติ"
            className="pl-9"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-from" className="text-xs text-muted-foreground">ตั้งแต่</label>
            <DatePicker id="audit-from" name="from" value={filters.from} onChange={(from) => navigate({ from })} placeholder="ทั้งหมด" className="w-48" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-to" className="text-xs text-muted-foreground">ถึง</label>
            <DatePicker
              id="audit-to"
              name="to"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(to) => navigate({ to })}
              placeholder="ทั้งหมด"
              className="w-48"
            />
          </div>
          {hasDateFilter && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate({ from: "", to: "" })} aria-label="ล้างช่วงวันที่">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <a
          href={`/api/admin/export/audit${exportParams ? `?${exportParams}` : ""}`}
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          ดาวน์โหลด CSV
        </a>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
        {[{ id: "", label: "ทั้งหมด" }, ...GROUPS].map((g) => {
          const count = g.id ? groupCounts[g.id] ?? 0 : all;
          const active = filters.group === g.id;
          return (
            <button
              key={g.id || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigate({ group: g.id })}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {g.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={cn("transition-opacity", isPending && "pointer-events-none opacity-60")}>
        {logs.length === 0 ? (
          <EmptyState icon={History} title={all === 0 && !filters.q && !hasDateFilter ? "ยังไม่มีประวัติการทำงาน" : "ไม่พบรายการที่ค้นหา"} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {logs.map((log) => {
                const g = groupOf(log.action);
                return (
                  <li key={log.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                    <p className="w-40 shrink-0 text-xs tabular-nums text-muted-foreground sm:pt-0.5">{formatDateTime(log.createdAt)}</p>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{log.summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">โดย {log.actorName}</p>
                    </div>
                    {g && <span className={cn("w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", g.className)}>{g.label}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            แสดง {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} จาก {total.toLocaleString("th-TH")} รายการ
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1 || isPending} onClick={() => navigate({ page: page - 1 })} aria-label="หน้าก่อน">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                หน้า {page}/{pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= pageCount || isPending}
                onClick={() => navigate({ page: page + 1 })}
                aria-label="หน้าถัดไป"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
