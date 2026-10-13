import Link from "next/link";
import type { ReactNode } from "react";
import type * as loanService from "@/services/loan.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { formatDate, cn } from "@/lib/utils";
import { getCategoryColor, getEquipmentIcon } from "@/lib/equipment-icon";
import { ArrowDownRight, ArrowUpRight, BellRing, Building2, CheckCheck, Timer, TrendingUp, Trophy, Undo2 } from "lucide-react";

type Loan = Awaited<ReturnType<typeof loanService.listLoans>>[number];
type Request = { key: string; items: Loan[] };

const DAY = 24 * 60 * 60 * 1000;

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

function splitDuration(ms: number) {
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return { value: Math.max(1, Math.round(hours * 60)), decimals: 0, unit: " นาที" };
  if (hours < 48) return { value: hours, decimals: hours < 10 ? 1 : 0, unit: " ชม." };
  return { value: hours / 24, decimals: 1, unit: " วัน" };
}

function durationProps(ms: number) {
  const { value, decimals, unit } = splitDuration(ms);
  return { value, decimals, suffix: unit };
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  delta,
}: {
  icon: typeof Timer;
  label: string;
  value: ReactNode;
  hint: string;
  delta?: { text: string; good: boolean | null };
}) {
  return (
    <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-popover">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                delta.good === null ? "bg-muted text-muted-foreground" : delta.good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}
            >
              {delta.good !== null && (delta.good ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
              {delta.text}
            </span>
          )}
          <span>{hint}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Horizontal bar list: one series, one hue, value at the bar tip. */
function BarList({ rows, unit, emptyText }: { rows: { label: string; value: number; icon?: ReactNode }[]; unit: string; emptyText: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <li key={row.label} className="group flex items-center gap-3" title={`${row.label}: ${row.value} ${unit}`}>
          {row.icon}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{row.value}</span> {unit}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-r-[4px] bg-indigo-500 transition-colors animate-bar-grow group-hover:bg-indigo-600"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminInsights({ requests }: { requests: Request[] }) {
  const now = new Date();
  const firsts = requests.map(({ key, items }) => ({ key, items, first: items[0] }));

  // Requests per month, last 6 months (by submission date).
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const count = firsts.filter(({ first }) => {
      const created = new Date(first.createdAt);
      return created >= start && created < end;
    }).length;
    return {
      label: start.toLocaleDateString("th-TH", { month: "short" }),
      fullLabel: start.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
      count,
    };
  });
  const thisMonth = months[5].count;
  const lastMonth = months[4].count;
  const maxMonth = Math.max(1, ...months.map((month) => month.count));
  const peakIndex = months.reduce((best, month, index) => (month.count > months[best].count ? index : best), 0);

  // Approval outcomes and speed.
  const decided = firsts.filter(({ first }) => ["APPROVED", "RETURNED", "REJECTED"].includes(first.status));
  const approved = decided.filter(({ first }) => first.status !== "REJECTED");
  const approvalRate = percent(approved.length, decided.length);
  const approvalTimes = approved
    .filter(({ first }) => first.approvedAt)
    .map(({ first }) => new Date(first.approvedAt!).getTime() - new Date(first.createdAt).getTime())
    .filter((ms) => ms >= 0);
  const avgApproval = approvalTimes.length ? approvalTimes.reduce((sum, ms) => sum + ms, 0) / approvalTimes.length : null;

  // On-time returns: returned no later than the end of the due date.
  const returned = firsts.filter(({ first }) => first.status === "RETURNED" && first.returnDate);
  const onTime = returned.filter(({ first }) => {
    const due = new Date(first.dueDate);
    due.setHours(23, 59, 59, 999);
    return new Date(first.returnDate!).getTime() <= due.getTime();
  });
  const onTimeRate = percent(onTime.length, returned.length);

  // Due within the next 3 days (not yet overdue).
  const dueSoon = firsts
    .filter(({ first }) => {
      if (first.status !== "APPROVED") return false;
      const due = new Date(first.dueDate).getTime();
      return due >= now.getTime() - DAY / 2 && due <= now.getTime() + 3 * DAY;
    })
    .sort((a, b) => new Date(a.first.dueDate).getTime() - new Date(b.first.dueDate).getTime());

  // Most borrowed equipment (approved or returned loans, counted in units).
  const borrowedLoans = firsts.flatMap(({ items }) => items).filter((loan) => loan.status === "APPROVED" || loan.status === "RETURNED");
  const byEquipment = new Map<string, { label: string; value: number; category: string }>();
  for (const loan of borrowedLoans) {
    if (!loan.equipment) continue;
    const entry = byEquipment.get(loan.equipment.id) ?? { label: loan.equipment.name, value: 0, category: loan.equipment.category?.name ?? "" };
    entry.value += loan.quantity;
    byEquipment.set(loan.equipment.id, entry);
  }
  const topEquipment = Array.from(byEquipment.values()).sort((a, b) => b.value - a.value).slice(0, 5);

  // Requests by department.
  const byDepartment = new Map<string, number>();
  for (const { first } of firsts) {
    const name = first.user?.department?.name ?? "ไม่ระบุแผนก";
    byDepartment.set(name, (byDepartment.get(name) ?? 0) + 1);
  }
  const topDepartments = Array.from(byDepartment.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const monthDelta =
    lastMonth === 0
      ? { text: thisMonth > 0 ? "ใหม่" : "เท่าเดิม", good: null }
      : { text: `${thisMonth >= lastMonth ? "+" : ""}${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%`, good: thisMonth >= lastMonth ? true : null };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="insights-heading">
      <Reveal className="flex flex-col gap-4">
      <div>
        <h2 id="insights-heading" className="text-lg font-semibold tracking-tight">สถิติการยืม</h2>
        <p className="text-sm text-muted-foreground">ภาพรวมการให้บริการและการใช้งานอุปกรณ์</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={TrendingUp} label="คำขอเดือนนี้" value={<CountUp value={thisMonth} />} hint={`เดือนที่แล้ว ${lastMonth} คำขอ`} delta={monthDelta} />
        <StatTile
          icon={CheckCheck}
          label="อัตราการอนุมัติ"
          value={approvalRate === null ? "–" : <CountUp value={approvalRate} suffix="%" delay={80} />}
          hint={`อนุมัติ ${approved.length} จาก ${decided.length} คำขอที่พิจารณาแล้ว`}
        />
        <StatTile
          icon={Timer}
          label="เวลาอนุมัติเฉลี่ย"
          value={avgApproval === null ? "–" : <CountUp {...durationProps(avgApproval)} delay={160} />}
          hint="นับจากยื่นคำขอจนอนุมัติ"
        />
        <StatTile
          icon={Undo2}
          label="คืนตรงเวลา"
          value={onTimeRate === null ? "–" : <CountUp value={onTimeRate} suffix="%" delay={240} />}
          hint={returned.length ? `${onTime.length} จาก ${returned.length} รายการที่คืนแล้ว` : "ยังไม่มีรายการคืน"}
        />
      </div>

      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-baseline justify-between space-y-0">
            <CardTitle>คำขอยืม 6 เดือนล่าสุด</CardTitle>
            <span className="text-xs text-muted-foreground">รวม {months.reduce((sum, month) => sum + month.count, 0)} คำขอ</span>
          </CardHeader>
          <CardContent>
            <div className="relative h-48" role="img" aria-label="กราฟจำนวนคำขอยืมรายเดือน">
              {/* recessive gridlines at 0, half and max */}
              {[0, 0.5, 1].map((fraction) => (
                <div key={fraction} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `calc(1.5rem + (100% - 1.5rem) * ${0.82 * fraction})`, transform: "translateY(50%)" }}>
                  <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{Math.round(maxMonth * fraction)}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              ))}
              <div className="absolute inset-0 left-7 grid grid-cols-6">
                {months.map((month, index) => {
                  const height = (month.count / maxMonth) * 82;
                  const showLabel = month.count > 0 && (index === 5 || index === peakIndex);
                  return (
                    <div key={month.fullLabel} className="group relative flex flex-col items-center justify-end pb-6">
                      <span className="pointer-events-none absolute -top-1 z-10 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-popover group-hover:block">
                        {month.fullLabel} · {month.count} คำขอ
                      </span>
                      {showLabel && <span className="mb-1 text-xs font-semibold tabular-nums">{month.count}</span>}
                      <div
                        className={cn(
                          "w-6 max-w-[60%] origin-bottom rounded-t-[4px] transition-colors animate-column-grow",
                          index === 5 ? "bg-indigo-500 group-hover:bg-indigo-600" : "bg-indigo-300 group-hover:bg-indigo-400"
                        )}
                        style={{ height: `${Math.max(height, month.count > 0 ? 3 : 0)}%`, animationDelay: `${150 + index * 90}ms` }}
                      />
                      <span className="absolute bottom-0 text-xs text-muted-foreground">{month.label}</span>
                    </div>
                  );
                })}
              </div>
              {/* hover hit-area is the whole column; the table below is the accessible view */}
              <table className="sr-only">
                <caption>จำนวนคำขอยืมรายเดือน</caption>
                <tbody>
                  {months.map((month) => (
                    <tr key={month.fullLabel}>
                      <th scope="row">{month.fullLabel}</th>
                      <td>{month.count} คำขอ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>ใกล้ครบกำหนดคืน</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dueSoon.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีรายการที่ต้องคืนใน 3 วันนี้</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dueSoon.slice(0, 5).map(({ key, items, first }) => {
                  const daysLeft = Math.ceil((new Date(first.dueDate).getTime() - now.getTime()) / DAY);
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {items.map((item) => item.equipment?.name).filter(Boolean).join(", ") || "อุปกรณ์"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {first.user?.name ?? "ไม่พบผู้ยืม"} · คืน {formatDate(first.dueDate)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          daysLeft <= 1 ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {daysLeft <= 0 ? "วันนี้" : daysLeft === 1 ? "พรุ่งนี้" : `อีก ${daysLeft} วัน`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/admin/loans?tab=APPROVED" className="mt-3 flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              ดูรายการที่กำลังยืมทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>อุปกรณ์ที่ถูกยืมบ่อย</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <BarList
              unit="ชิ้น"
              emptyText="ยังไม่มีการยืมที่อนุมัติแล้ว"
              rows={topEquipment.map((entry) => {
                const Icon = getEquipmentIcon(entry.category);
                return {
                  label: entry.label,
                  value: entry.value,
                  icon: (
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", getCategoryColor(entry.category))}>
                      <Icon className="h-4 w-4" />
                    </span>
                  ),
                };
              })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>คำขอยืมตามแผนก</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <BarList
              unit="คำขอ"
              emptyText="ยังไม่มีคำขอยืม"
              rows={topDepartments.map((entry) => ({
                ...entry,
                icon: (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </span>
                ),
              }))}
            />
          </CardContent>
        </Card>
      </Reveal>
    </section>
  );
}
