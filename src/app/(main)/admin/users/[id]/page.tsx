import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getSession } from "@/lib/auth";
import * as userModel from "@/models/user.model";
import * as loanService from "@/services/loan.service";
import * as departmentService from "@/services/department.service";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { UserAdminPanel } from "@/components/user/user-admin-panel";
import { returnConditionBadgeClass, returnConditionLabel } from "@/lib/return-condition";
import { cn, formatDate } from "@/lib/utils";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [session, user, departments] = await Promise.all([
    getSession(),
    userModel.findUserById(params.id),
    departmentService.listDepartments(),
  ]);
  if (!user || user.approvalStatus !== "APPROVED") notFound();

  const loans = await loanService.listLoans({ userId: user.id });
  const groups = Array.from(
    loans
      .reduce((map, loan) => map.set(loan.requestGroupId ?? loan.id, [...(map.get(loan.requestGroupId ?? loan.id) ?? []), loan]), new Map<string, typeof loans>())
      .values()
  );
  const now = Date.now();
  const active = groups.filter((g) => g[0].status === "APPROVED");
  const overdue = active.filter((g) => new Date(g[0].dueDate).getTime() < now);
  const problemReturns = loans.filter((l) => l.returnCondition && l.returnCondition !== "NORMAL").length;

  const stats = [
    { label: "คำขอทั้งหมด", value: groups.length },
    { label: "กำลังยืมอยู่", value: active.length },
    { label: "เกินกำหนดคืน", value: overdue.length, alert: overdue.length > 0 },
    { label: "คืนสภาพไม่ปกติ", value: problemReturns, alert: problemReturns > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        กลับไปรายชื่อผู้ใช้งาน
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{user.name}</h1>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
              </span>
              {user.isActive === false && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">ถูกระงับ</span>}
              {user.mustChangePassword && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">ใช้รหัสผ่านชั่วคราวอยู่</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              รหัสพนักงาน <span className="font-mono">{user.employeeId ?? "-"}</span> · {user.department.name}
              {user.phone && ` · เบอร์ภายใน ${user.phone}`} · สมัครเมื่อ {formatDate(user.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-2xl font-bold tabular-nums", s.alert && "text-rose-600")}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>ประวัติการยืม</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <EmptyState icon={ClipboardList} title="ยังไม่เคยยืมอุปกรณ์" />
            ) : (
              <ul className="divide-y divide-border">
                {groups.map((items) => {
                  const first = items[0];
                  const isOverdue = first.status === "APPROVED" && new Date(first.dueDate).getTime() < now;
                  return (
                    <li key={first.requestGroupId ?? first.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1">
                        {items.map((loan) => (
                          <p key={loan.id} className="text-sm">
                            <span className="font-medium">{loan.equipment?.name ?? "อุปกรณ์ที่ถูกนำออกจากระบบ"}</span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {loan.units.length > 0 ? loan.units.map((u) => u.assetTag).join(", ") : `${loan.quantity} ชิ้น`}
                            </span>
                            {loan.returnCondition && loan.returnCondition !== "NORMAL" && (
                              <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", returnConditionBadgeClass[loan.returnCondition])}>
                                คืนสภาพ{returnConditionLabel(loan.returnCondition)}
                              </span>
                            )}
                          </p>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          ยื่นคำขอ {formatDate(first.createdAt)} · {isOverdue ? <span className="font-medium text-rose-600">เลยกำหนดคืน {formatDate(first.dueDate)}</span> : `กำหนดคืน ${formatDate(first.dueDate)}`}
                          {first.returnDate && ` · คืนแล้ว ${formatDate(first.returnDate)}`}
                        </p>
                      </div>
                      <LoanStatusBadge status={first.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <UserAdminPanel
          user={{
            id: user.id,
            name: user.name,
            role: user.role,
            isActive: user.isActive !== false,
            departmentId: user.departmentId,
          }}
          isSelf={session?.user.id === user.id}
          activeLoanCount={active.length}
          departments={departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))}
        />
      </div>
    </div>
  );
}
