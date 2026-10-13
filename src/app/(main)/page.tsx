import { redirect } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getSession } from "@/lib/auth";
import * as equipmentService from "@/services/equipment.service";
import * as loanService from "@/services/loan.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminInsights } from "@/components/dashboard/admin-insights";
import { CountUp } from "@/components/motion/count-up";
import { TimeOfDayIcon, timeGreeting } from "@/components/dashboard/time-greeting";
import { formatDate, cn } from "@/lib/utils";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import {
  Laptop,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Bell,
  ClipboardList,
  AlertTriangle,
  Layers,
  History,
  CalendarClock,
  Plus,
} from "lucide-react";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Calendar days from today until `date` (negative once past). */
function daysUntil(date: Date | string) {
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

const DUE_SOON_DAYS = 2;

function dueCountdown(date: Date | string, overdue: boolean) {
  const days = daysUntil(date);
  if (overdue) return { text: days < 0 ? `เลยกำหนด ${-days} วัน` : "เลยกำหนดแล้ว", tone: "rose" as const };
  if (days === 0) return { text: "ครบกำหนดวันนี้", tone: "amber" as const };
  if (days === 1) return { text: "คืนพรุ่งนี้", tone: "amber" as const };
  return { text: `อีก ${days} วัน`, tone: days <= DUE_SOON_DAYS ? ("amber" as const) : ("slate" as const) };
}

const countdownChipClass = {
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  const [equipment, loans] = await Promise.all([
    equipmentService.listEquipment(undefined, { includeHidden: isAdmin }),
    loanService.listLoans(isAdmin ? undefined : { userId: session.user.id }),
  ]);
  const loanGroups = new Map<string, typeof loans>();
  for (const loan of loans) {
    const key = loan.requestGroupId || loan.id;
    loanGroups.set(key, [...(loanGroups.get(key) ?? []), loan]);
  }
  const requests = Array.from(loanGroups.entries()).map(([key, items]) => ({ key, items }));

  // Count physical units (not equipment models): total = available + on loan + reserved by pending requests.
  const activeEquipment = equipment.filter((e) => e.status === "ACTIVE");
  const totalUnits = activeEquipment.reduce((sum, e) => sum + e.quantity, 0);
  const availableUnits = activeEquipment.reduce((sum, e) => sum + e.availableQuantity, 0);
  const openUnits = await loanService.sumOpenQuantities(activeEquipment.map((e) => e.id));
  const borrowedUnits = openUnits.approved;
  const reservedUnits = openUnits.pending;
  const utilization = percent(borrowedUnits, totalUnits);

  const now = Date.now();
  const pending = requests.filter(({ items }) => items[0].status === "PENDING").length;
  const overdue = requests.filter(
    ({ items }) => items[0].status === "APPROVED" && new Date(items[0].dueDate).getTime() < now
  ).length;
  const activeRequests = requests.filter(({ items }) => items[0].status === "APPROVED").length;
  const loansHref = isAdmin ? "/admin/loans" : "/loans";

  // Borrower view: what I have out, what's due, and what's waiting.
  const myActive = requests
    .filter(({ items }) => items[0].status === "APPROVED")
    .map(({ key, items }) => ({
      key,
      items,
      dueDate: items[0].dueDate,
      overdue: new Date(items[0].dueDate).getTime() < now,
    }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const myActiveUnits = myActive.reduce((sum, r) => sum + r.items.reduce((s, item) => s + item.quantity, 0), 0);
  const dueSoon = myActive.filter((r) => !r.overdue && daysUntil(r.dueDate) <= DUE_SOON_DAYS).length;
  const nextDue = myActive[0];
  // Everything due on the same day as the earliest one (or everything already overdue) is shown together.
  const nextDueGroup = nextDue
    ? myActive.filter((r) => (nextDue.overdue ? r.overdue : daysUntil(r.dueDate) === daysUntil(nextDue.dueDate)))
    : [];
  const nextDueNames = Array.from(
    new Set(nextDueGroup.flatMap((r) => r.items.map((item) => item.equipment?.name).filter(Boolean)))
  ) as string[];
  const nextDueUnits = nextDueGroup.reduce((sum, r) => sum + r.items.reduce((s, item) => s + item.quantity, 0), 0);
  const returnedCount = requests.filter(({ items }) => items[0].status === "RETURNED").length;

  const categories = Array.from(
    activeEquipment
      .reduce((map, e) => {
        const entry = map.get(e.category.name) ?? { name: e.category.name, total: 0, available: 0 };
        entry.total += e.quantity;
        entry.available += e.availableQuantity;
        return map.set(e.category.name, entry);
      }, new Map<string, { name: string; total: number; available: number }>())
      .values()
  ).sort((a, b) => b.total - a.total);

  type Stat = {
    label: string;
    value: number;
    unit: string;
    hint: string;
    icon: typeof Laptop;
    iconClass: string;
    barClass?: string;
    share?: number;
    href: string;
    action: string;
  };

  const userStats: Stat[] = [
    {
      label: "กำลังยืมอยู่",
      value: myActiveUnits,
      unit: "ชิ้น",
      hint: myActive.length > 0 ? `จาก ${myActive.length} คำขอ` : "ยังไม่มีอุปกรณ์ที่ยืมอยู่",
      icon: Laptop,
      iconClass: "bg-indigo-100 text-indigo-600",
      href: "/loans?tab=APPROVED",
      action: "ดูรายการที่ยืมอยู่",
    },
    {
      label: "รออนุมัติ",
      value: pending,
      unit: "คำขอ",
      hint: pending > 0 ? "รอผู้ดูแลตรวจสอบ" : "ไม่มีคำขอค้าง",
      icon: Clock,
      iconClass: "bg-amber-100 text-amber-600",
      href: "/loans?tab=PENDING",
      action: "ดูคำขอที่รออนุมัติ",
    },
    {
      label: "ต้องคืนเร็วๆ นี้",
      value: overdue + dueSoon,
      unit: "คำขอ",
      hint: overdue > 0 ? `เกินกำหนด ${overdue} คำขอ` : dueSoon > 0 ? `ครบกำหนดภายใน ${DUE_SOON_DAYS} วัน` : "ไม่มีรายการใกล้ครบกำหนด",
      icon: AlertTriangle,
      iconClass: overdue > 0 ? "bg-rose-100 text-rose-600" : dueSoon > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500",
      href: overdue > 0 ? "/loans?tab=OVERDUE" : "/loans?tab=APPROVED",
      action: "ดูกำหนดคืน",
    },
    {
      label: "ยืมไปแล้วทั้งหมด",
      value: myActive.length + returnedCount,
      unit: "ครั้ง",
      hint: `คืนเรียบร้อย ${returnedCount} ครั้ง`,
      icon: History,
      iconClass: "bg-emerald-100 text-emerald-600",
      href: "/loans",
      action: "ดูประวัติการยืม",
    },
  ];

  const adminStats: Stat[] = [
    {
      label: "อุปกรณ์ทั้งหมด",
      value: totalUnits,
      unit: "ชิ้น",
      hint: `${activeEquipment.length} รุ่น · ${categories.length} ประเภท`,
      icon: Laptop,
      iconClass: "bg-indigo-100 text-indigo-600",
      barClass: "bg-indigo-500",
      share: 100,
      href: isAdmin ? "/admin/equipment" : "/equipment",
      action: isAdmin ? "จัดการอุปกรณ์" : "ดูอุปกรณ์",
    },
    {
      label: "พร้อมให้ยืม",
      value: availableUnits,
      unit: "ชิ้น",
      hint:
        reservedUnits > 0
          ? `${percent(availableUnits, totalUnits)}% · จองไว้ ${reservedUnits} ชิ้น`
          : `${percent(availableUnits, totalUnits)}% ของทั้งหมด`,
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-600",
      barClass: "bg-emerald-500",
      share: percent(availableUnits, totalUnits),
      href: "/equipment",
      action: "ขอยืมเลย",
    },
    {
      label: "กำลังถูกยืม",
      value: borrowedUnits,
      unit: "ชิ้น",
      hint: isAdmin ? `จาก ${activeRequests} คำขอที่ยังไม่คืน` : `${activeRequests} คำขอของฉันที่ยังไม่คืน`,
      icon: Clock,
      iconClass: "bg-amber-100 text-amber-600",
      barClass: "bg-amber-500",
      share: utilization,
      href: `${loansHref}?tab=APPROVED`,
      action: "ดูรายการที่ยืมอยู่",
    },
    {
      label: "เกินกำหนดคืน",
      value: overdue,
      unit: "คำขอ",
      hint: overdue > 0 ? "ต้องติดตามทวงคืน" : "ไม่มีรายการค้างคืน",
      icon: AlertTriangle,
      iconClass: overdue > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500",
      barClass: "bg-rose-500",
      share: percent(overdue, Math.max(activeRequests, 1)),
      href: `${loansHref}?tab=OVERDUE`,
      action: "ดูรายการเกินกำหนด",
    },
  ];
  const stats = isAdmin ? adminStats : userStats;

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="keep-light relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-popover animate-rise-in sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl items-start gap-4">
            <TimeOfDayIcon className="hidden sm:flex" />
            <div>
              <p className="text-sm text-indigo-100">{today}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {timeGreeting()}, {session.user.name}
              </h1>
              <p className="mt-2 text-indigo-100">
                {isAdmin ? "ภาพรวมระบบยืมอุปกรณ์ IT ขององค์กร" : "ภาพรวมการยืมอุปกรณ์ของคุณ"}
              </p>
              {!isAdmin && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/equipment"
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-soft transition-colors hover:bg-indigo-50"
                  >
                    <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
                    ยืมอุปกรณ์
                  </Link>
                  <Link
                    href="/loans"
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10"
                  >
                    รายการของฉัน
                  </Link>
                </div>
              )}
            </div>
          </div>

          {!isAdmin && (
            <div className="w-full rounded-2xl bg-white/10 p-5 ring-1 ring-inset ring-white/15 backdrop-blur-sm md:w-80">
              <p className="flex items-center gap-1.5 text-xs text-indigo-100">
                <CalendarClock className="h-3.5 w-3.5" />
                ต้องคืนถัดไป
              </p>
              {nextDue ? (
                <>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <p className="text-3xl font-bold tracking-tight">{dueCountdown(nextDue.dueDate, nextDue.overdue).text}</p>
                    {nextDueUnits > 1 && (
                      <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                        {nextDueUnits} ชิ้น
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm text-indigo-50">
                    {nextDueNames.slice(0, 2).map((name) => (
                      <li key={name} className="truncate">• {name}</li>
                    ))}
                    {nextDueNames.length > 2 && (
                      <li>
                        <Link href={nextDue.overdue ? "/loans?tab=OVERDUE" : "/loans?tab=APPROVED"} className="text-xs font-medium text-white underline-offset-2 hover:underline">
                          และอีก {nextDueNames.length - 2} รายการ
                        </Link>
                      </li>
                    )}
                  </ul>
                  <p className="mt-1.5 text-xs text-indigo-100">
                    {nextDue.overdue ? `กำหนดคืนเดิม ${formatDate(nextDue.dueDate)}` : `กำหนดคืน ${formatDate(nextDue.dueDate)}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xl font-semibold">ไม่มีอุปกรณ์ที่ต้องคืน</p>
                  <p className="mt-1 text-sm text-indigo-100">
                    {pending > 0 ? `มีคำขอรออนุมัติ ${pending} คำขอ` : "เลือกยืมอุปกรณ์ได้เลย"}
                  </p>
                </>
              )}
            </div>
          )}

          {isAdmin && (
          <div className="flex items-center gap-5 rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/15" />
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className="text-white animate-ring-fill"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - utilization / 100)}
                  style={
                    {
                      "--ring-circumference": RING_CIRCUMFERENCE,
                      "--ring-offset": RING_CIRCUMFERENCE * (1 - utilization / 100),
                    } as CSSProperties
                  }
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CountUp value={utilization} suffix="%" duration={1200} className="text-3xl font-bold" />
                <span className="text-xs text-indigo-100">อัตราการใช้งาน</span>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-indigo-100">ถูกยืมอยู่</dt>
                <dd className="font-semibold tabular-nums">{borrowedUnits} / {totalUnits} ชิ้น</dd>
              </div>
              <div>
                <dt className="text-xs text-indigo-100">{isAdmin ? "รออนุมัติ" : "คำขอของฉันที่รออนุมัติ"}</dt>
                <dd className="font-semibold tabular-nums">{pending} คำขอ</dd>
              </div>
            </dl>
          </div>
          )}
        </div>
      </section>

      {!isAdmin && (overdue > 0 || dueSoon > 0) && (
        <Link href={overdue > 0 ? "/loans?tab=OVERDUE" : "/loans?tab=APPROVED"} className="animate-rise-in" style={{ animationDelay: "80ms" }}>
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-5 py-4 transition-colors",
              overdue > 0 ? "border-rose-200 bg-rose-50 hover:bg-rose-100/70" : "border-amber-200 bg-amber-50 hover:bg-amber-100/70"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  overdue > 0 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                )}
              >
                <AlertTriangle className="h-[18px] w-[18px]" />
              </span>
              <p className={cn("text-sm", overdue > 0 ? "text-rose-900" : "text-amber-900")}>
                {overdue > 0 ? (
                  <>
                    คุณมีอุปกรณ์ที่<span className="font-bold">เลยกำหนดคืน {overdue} คำขอ</span> กรุณานำไปคืนที่ฝ่าย IT
                  </>
                ) : (
                  <>
                    มีอุปกรณ์ที่<span className="font-bold">ต้องคืนภายใน {DUE_SOON_DAYS} วัน</span> {dueSoon} คำขอ
                  </>
                )}
              </p>
            </div>
            <span className={cn("flex shrink-0 items-center gap-1 text-sm font-medium", overdue > 0 ? "text-rose-700" : "text-amber-700")}>
              ดูรายการ <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group animate-rise-in"
            style={{ animationDelay: `${100 + index * 70}ms` }}
          >
            <Card className="relative h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-popover">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110", stat.iconClass)}>
                    <stat.icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="flex items-baseline gap-1.5">
                  <CountUp value={stat.value} delay={150 + index * 70} className="text-3xl font-bold tracking-tight" />
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </p>
                <div className="mt-auto space-y-1.5">
                  {stat.share !== undefined && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full origin-left rounded-full animate-bar-grow", stat.barClass)}
                        style={{ width: `${stat.share}%`, animationDelay: `${300 + index * 70}ms` }}
                      />
                    </div>
                  )}
                  <div className="relative h-4 text-xs">
                    <p className="absolute inset-0 truncate text-muted-foreground transition-opacity group-hover:opacity-0">{stat.hint}</p>
                    <p className="absolute inset-0 flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      {stat.action} <ArrowUpRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {isAdmin && pending > 0 && (
        <Link href="/admin/loans" className="animate-rise-in" style={{ animationDelay: "380ms" }}>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100/70">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              </span>
              <p className="text-sm text-amber-900">
                มีคำขอยืมที่รอการอนุมัติ <span className="font-bold">{pending}</span> รายการ
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
              จัดการ <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="animate-rise-in lg:col-span-2" style={{ animationDelay: "420ms" }}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{isAdmin ? "รายการยืมล่าสุด" : "รายการยืมของฉัน"}</CardTitle>
            <Link href={isAdmin ? "/admin/loans" : "/loans"} className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              ดูทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="ยังไม่มีรายการยืม"
                description={isAdmin ? "เมื่อมีคำขอยืมเข้ามาจะแสดงที่นี่" : "เริ่มต้นขอยืมอุปกรณ์ได้จากหน้าอุปกรณ์"}
              />
            ) : (
              <div className="flex flex-col gap-1">
                {requests.slice(0, 6).map(({ key, items }) => {
                  const loan = items[0];
                  const equipmentNames = items.map((item) => item.equipment?.name).filter(Boolean).join(", ");
                  const categoryName = loan.equipment?.category?.name ?? "";
                  const Icon = getEquipmentIcon(categoryName);
                  const isOverdue = loan.status === "APPROVED" && new Date(loan.dueDate).getTime() < now;
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", getCategoryColor(categoryName))}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium">
                            {equipmentNames || "อุปกรณ์ที่ถูกนำออกจากระบบ"}
                            {items.length > 1 && <span className="ml-1 text-xs font-normal text-muted-foreground">({items.length} รายการ)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin ? `${loan.user?.name ?? "บัญชีผู้ยืมไม่พบ"} · ` : ""}
                            {isOverdue ? (
                              <span className="font-medium text-rose-600">เลยกำหนดคืน {formatDate(loan.dueDate)}</span>
                            ) : (
                              `กำหนดคืน ${formatDate(loan.dueDate)}`
                            )}
                          </p>
                          {loan.status === "REJECTED" && loan.rejectionReason && (
                            <p className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium leading-relaxed text-rose-800">
                              หมายเหตุ: {loan.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5 sm:flex-row sm:items-center">
                        {loan.status === "APPROVED" && (() => {
                          const countdown = dueCountdown(loan.dueDate, isOverdue);
                          return (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", countdownChipClass[countdown.tone])}>
                              {countdown.text}
                            </span>
                          );
                        })()}
                        <LoanStatusBadge status={loan.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise-in" style={{ animationDelay: "480ms" }}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>ความพร้อมตามประเภท</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ในระบบ</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {categories.map((category, index) => {
                  const Icon = getEquipmentIcon(category.name);
                  const share = percent(category.available, category.total);
                  return (
                    <li key={category.name} className="flex items-center gap-3">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", getCategoryColor(category.name))}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{category.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            ว่าง <span className="font-semibold text-foreground">{category.available}</span> / {category.total}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full origin-left rounded-full animate-bar-grow",
                              share === 0 ? "bg-rose-400" : share < 50 ? "bg-amber-400" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.max(share, 4)}%`, animationDelay: `${550 + index * 80}ms` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && <AdminInsights requests={requests} />}
    </div>
  );
}
