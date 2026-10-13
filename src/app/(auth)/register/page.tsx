import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import * as departmentService from "@/services/department.service";
import { RegistrationForm } from "@/components/user/registration-form";

export default async function RegisterPage() {
  const departments = await departmentService.listDepartments();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <header className="border-b border-border bg-muted/25 px-6 py-5 sm:px-8">
          <Link href="/login" className="mb-6 flex w-fit items-center gap-2 text-foreground">
            <Logo size={36} />
          </Link>
          <h1 className="text-2xl font-bold">สมัครใช้งาน</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">ใช้รหัสพนักงานสมัคร ระบบจะเปิดให้เข้าใช้งานหลังผู้ดูแลอนุมัติ</p>
        </header>
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {departments.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">ยังไม่มีแผนกในระบบ กรุณาติดต่อผู้ดูแล</p>
          ) : (
            <RegistrationForm departments={departments} />
          )}
        </div>
      </section>
    </main>
  );
}