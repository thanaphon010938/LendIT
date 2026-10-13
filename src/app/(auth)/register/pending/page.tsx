import Link from "next/link";
import { CircleCheck, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegistrationPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-7 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Clock3 className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">ส่งคำขอสมัครแล้ว</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">บัญชีของคุณจะเข้าใช้งานได้หลังผู้ดูแลระบบตรวจสอบและอนุมัติ</p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/login"><CircleCheck className="h-4 w-4" /> กลับไปหน้าเข้าสู่ระบบ</Link>
        </Button>
      </section>
    </main>
  );
}