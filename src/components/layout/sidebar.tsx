"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Logo, LogoMark } from "@/components/brand/logo";
import {
  LayoutDashboard,
  Laptop,
  ClipboardList,
  ShieldCheck,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  Wrench,
  FileSpreadsheet,
  History,
} from "lucide-react";

const links = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/equipment", label: "ยืมอุปกรณ์", icon: Laptop },
  { href: "/loans", label: "รายการของฉัน", icon: ClipboardList },
];

const adminLinkGroups = [
  {
    label: "งานยืม-คืน",
    links: [{ href: "/admin/loans", label: "คำขอยืม-คืน", icon: ClipboardList }],
  },
  {
    label: "คลังอุปกรณ์",
    links: [
      { href: "/admin/equipment", label: "รายการอุปกรณ์", icon: ShieldCheck },
      { href: "/admin/issues", label: "อุปกรณ์รอซ่อม", icon: Wrench },
    ],
  },
  {
    label: "บุคลากร",
    links: [
      { href: "/admin/users", label: "ผู้ใช้งาน", icon: UsersRound },
      { href: "/admin/departments", label: "แผนก", icon: Building2 },
    ],
  },
  {
    label: "รายงานและบันทึก",
    links: [
      { href: "/admin/reports", label: "รายงาน / ส่งออก", icon: FileSpreadsheet },
      { href: "/admin/audit", label: "ประวัติการทำงาน", icon: History },
    ],
  },
];

function NavLinks({
  isAdmin,
  onNavigate,
  actionNeededCount = 0,
  openIssueCount = 0,
  collapsed = false,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
  actionNeededCount?: number;
  openIssueCount?: number;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
              active && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <link.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {!collapsed && link.label}
          </Link>
        );
      })}

      {isAdmin && (
        <>
          {adminLinkGroups.map((group) => (
            <div key={group.label} className={cn("mt-4 flex flex-col gap-1 first:mt-5", collapsed && "mt-2 first:mt-3")}>
              {!collapsed && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>}
              {group.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                const badgeCount =
                  link.href === "/admin/loans" ? actionNeededCount : link.href === "/admin/issues" ? openIssueCount : 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    title={collapsed ? link.label : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-0",
                      active && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <link.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {!collapsed && <span className="flex-1">{link.label}</span>}
                    {badgeCount > 0 && (
                      <span className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white",
                        collapsed && "absolute right-1 top-0.5 h-4 min-w-4 text-[10px]"
                      )}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </>
      )}
    </nav>
  );
}

function Brand({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    collapsed ? (
      <div className="flex shrink-0 flex-col items-center gap-3 px-2 pb-2 pt-4">
        <Link href="/" className="flex items-center justify-center" aria-label="LendIT หน้าแรก">
          <LogoMark size={38} />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="ขยายเมนู"
          title="ขยายเมนู"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <Link href="/" className="flex items-center" aria-label="LendIT หน้าแรก">
          <Logo size={38} tagline="ระบบยืมอุปกรณ์ IT" />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="ย่อเมนู"
          title="ย่อเมนู"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    )
  );
}

function UserCard({
  userName,
  role,
  onNavigate,
  collapsed = false,
}: {
  userName: string;
  role: "ADMIN" | "USER";
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-border p-4", collapsed && "flex-col gap-2 p-3")}>
      <Link
        href="/profile"
        onClick={onNavigate}
        title={collapsed ? userName : undefined}
        className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors hover:bg-muted", collapsed && "flex-none justify-center")}
      >
        <Avatar name={userName} />
        {!collapsed && <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}</p>
        </div>}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="ออกจากระบบ"
        aria-label="ออกจากระบบ"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Sidebar({
  userName,
  isAdmin,
  role,
  actionNeededCount = 0,
  openIssueCount = 0,
  collapsed = false,
  onToggleCollapsed,
}: {
  userName: string;
  isAdmin: boolean;
  role: "ADMIN" | "USER";
  actionNeededCount?: number;
  openIssueCount?: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-64"
      )}>
        <Brand collapsed={collapsed} onToggle={() => onToggleCollapsed?.()} />
        <NavLinks isAdmin={isAdmin} actionNeededCount={actionNeededCount} openIssueCount={openIssueCount} collapsed={collapsed} />
        <UserCard userName={userName} role={role} collapsed={collapsed} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link href="/" className="flex items-center" aria-label="LendIT หน้าแรก">
          <Logo size={30} />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
          {actionNeededCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
              {actionNeededCount > 99 ? "99+" : actionNeededCount}
            </span>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-card shadow-popover animate-fade-in">
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <Logo size={34} tagline="ระบบยืมอุปกรณ์ IT" />
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="ปิดเมนู"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} actionNeededCount={actionNeededCount} openIssueCount={openIssueCount} />
            <UserCard userName={userName} role={role} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
