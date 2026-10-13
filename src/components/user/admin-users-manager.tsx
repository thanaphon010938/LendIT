"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, UsersRound } from "lucide-react";
import type { Role, UserApprovalStatus } from "@prisma/client";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { UserApprovalActions } from "@/components/user/user-approval-actions";
import { cn, formatDate } from "@/lib/utils";

type AdminUser = {
  id: string;
  employeeId: string | null;
  name: string;
  email: string | null;
  role: Role;
  approvalStatus: UserApprovalStatus;
  isActive: boolean | null;
  approvalNote: string | null;
  approvedAt: Date | null;
  reviewedByAdminName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  phone: string | null;
  department: { id: string; code: string; name: string };
};

type UserFilter = "ALL" | UserApprovalStatus;

const statusTabs: { id: UserFilter; label: string }[] = [
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติแล้ว" },
  { id: "REJECTED", label: "ปฏิเสธ" },
  { id: "ALL", label: "ทั้งหมด" },
];

const statusStyles: Record<UserApprovalStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-rose-50 text-rose-800",
};

const statusLabels: Record<UserApprovalStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

export function AdminUsersManager({ users }: { users: AdminUser[] }) {
  const [tab, setTab] = useState<(typeof statusTabs)[number]["id"]>("PENDING");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());

  const visibleUsers = useMemo(() => users.filter((user) => {
    const matchesStatus = tab === "ALL" || user.approvalStatus === tab;
    const searchable = `${user.employeeId ?? ""} ${user.name} ${user.email} ${user.department.name}`.toLocaleLowerCase();
    return matchesStatus && (!deferredSearch || searchable.includes(deferredSearch));
  }), [deferredSearch, tab, users]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารหัสพนักงาน ชื่อ อีเมล หรือแผนก" aria-label="ค้นหาผู้ใช้งาน" className="pl-9" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="กรองสถานะบัญชี">
        {statusTabs.map((item) => {
          const count = users.filter((user) => item.id === "ALL" || user.approvalStatus === item.id).length;
          const active = item.id === tab;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {item.label}<span className={cn("rounded-full px-1.5 py-0.5 text-xs tabular-nums", active ? "bg-white/15" : "bg-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      {visibleUsers.length === 0 ? (
        <EmptyState icon={UsersRound} title={deferredSearch ? "ไม่พบผู้ใช้งาน" : tab === "PENDING" ? "ไม่มีคำขอสมัครที่รออนุมัติ" : "ไม่พบผู้ใช้งานในสถานะนี้"} />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleUsers.map((user) => (
            <Card key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusStyles[user.approvalStatus])}>{statusLabels[user.approvalStatus]}</span>
                    {user.approvalStatus === "APPROVED" && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                        {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                      </span>
                    )}
                    {user.approvalStatus === "APPROVED" && user.isActive === false && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">ถูกระงับ</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    รหัสพนักงาน {user.employeeId ?? "ยังไม่ระบุ"}{user.email && ` · ${user.email}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{user.department.name}{user.phone && ` · เบอร์ภายใน ${user.phone}`} · สมัครเมื่อ {formatDate(user.createdAt)}</p>
                  {user.approvalNote && <p className="mt-1 text-xs text-rose-700">เหตุผล: {user.approvalNote}</p>}
                  {user.reviewedAt && <p className="mt-1 text-xs text-muted-foreground">พิจารณาโดย {user.reviewedByAdminName ?? "ผู้ดูแลระบบ"} · {formatDate(user.reviewedAt)}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.approvalStatus === "PENDING" && <UserApprovalActions userId={user.id} userName={user.name} />}
                {user.approvalStatus === "APPROVED" && (
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="group inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    จัดการ
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}