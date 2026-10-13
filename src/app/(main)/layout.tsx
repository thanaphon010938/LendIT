import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { MainShell } from "@/components/layout/main-shell";
import * as loanService from "@/services/loan.service";
import * as issueService from "@/services/equipment-issue.service";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }
  // Suspended while logged in: the login page signs the stale session out and explains why.
  if (!session.user.active) {
    redirect("/login?suspended=1");
  }

  const isAdmin = session.user.role === "ADMIN";
  const [actionNeededCount, openIssueCount] = isAdmin
    ? await Promise.all([loanService.countActionNeeded(), issueService.countOpenIssues()])
    : [0, 0];

  return (
    <MainShell
      userName={session.user.name ?? session.user.email ?? ""}
      isAdmin={isAdmin}
      role={session.user.role}
      actionNeededCount={actionNeededCount}
      openIssueCount={openIssueCount}
    >
      {session.user.mustChangePassword && (
        <Link
          href="/profile"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 transition-colors hover:bg-amber-100/70"
        >
          <KeyRound className="h-5 w-5 shrink-0 text-amber-600" />
          <span>
            คุณกำลังใช้<span className="font-semibold">รหัสผ่านชั่วคราว</span>ที่ผู้ดูแลตั้งให้ กรุณาตั้งรหัสผ่านใหม่ของคุณเองที่หน้าโปรไฟล์
          </span>
        </Link>
      )}
      {children}
    </MainShell>
  );
}
