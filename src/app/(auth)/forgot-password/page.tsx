import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// Self-service reset was removed: it changed passwords by employee ID alone, which let anyone take over
// an account. Passwords are now reset by an admin (temporary password). Kept for old bookmarks.
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
        <Link href="/login" className="mb-7 flex w-fit items-center gap-2 text-foreground">
          <Logo size={36} />
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold">ลืมรหัสผ่าน</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          กรุณาติดต่อผู้ดูแลระบบที่แผนก IT เพื่อขอรีเซ็ตรหัสผ่าน ผู้ดูแลจะออกรหัสผ่านชั่วคราวให้ และคุณจะตั้งรหัสใหม่ได้เองหลังเข้าสู่ระบบ
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </main>
  );
}
