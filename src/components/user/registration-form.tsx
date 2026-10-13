"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { AlertCircle, Check, IdCard, LockKeyhole, UserRound } from "lucide-react";
import { registerUserAction } from "@/actions/user.action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Department } from "@prisma/client";
import type { ActionResult } from "@/actions/equipment.action";

export function RegistrationForm({ departments }: { departments: Department[] }) {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(registerUserAction, undefined);
  const [password, setPassword] = useState("");
  const passwordChecks = [
    { label: "อย่างน้อย 8 ตัวอักษร", passed: password.length >= 8 },
    { label: "อักษรอังกฤษตัวเล็ก a-z", passed: /[a-z]/.test(password) },
    { label: "อักษรอังกฤษตัวใหญ่ A-Z", passed: /[A-Z]/.test(password) },
    { label: "อักขระพิเศษ เช่น ! @ # $", passed: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const passwordStrength = passwordChecks.filter((check) => check.passed).length;
  const strengthLabel = passwordStrength === 4 ? "ปลอดภัย" : passwordStrength >= 2 ? "ปานกลาง" : "อ่อน";
  const strengthColor = passwordStrength === 4 ? "bg-emerald-500" : passwordStrength >= 2 ? "bg-amber-500" : "bg-rose-500";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employeeId">รหัสพนักงาน</Label>
          <div className="relative">
            <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="employeeId" name="employeeId" placeholder="เช่น EMP00123" className="pl-10" autoComplete="username" required />
          </div>
          <p className="text-xs text-muted-foreground">ใช้รหัสนี้ยืนยันว่าเป็นบุคลากร และสมัครได้หนึ่งบัญชีต่อรหัส</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อ-นามสกุล</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" name="name" placeholder="ชื่อที่ใช้แสดงในระบบ" className="pl-10" autoComplete="name" required />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="departmentId">แผนก</Label>
          <Select id="departmentId" name="departmentId" defaultValue="" required>
            <option value="" disabled>เลือกแผนก</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">เบอร์ภายใน (ถ้ามี)</Label>
          <Input id="phone" name="phone" placeholder="เช่น 1234" autoComplete="tel-extension" />
        </div>
      </div>

      <section className="border-t border-border pt-5" aria-labelledby="password-section-title">
        <div className="mb-4">
          <h2 id="password-section-title" className="text-sm font-semibold">ตั้งรหัสผ่าน</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">กำหนดรหัสผ่านที่ตรงตามเงื่อนไขด้านล่าง</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-10"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center gap-3 text-xs">
                <div className="grid flex-1 grid-cols-4 gap-1" role="img" aria-label={`ความปลอดภัย ${passwordStrength} จาก 4`}>
                  {passwordChecks.map((check, index) => (
                    <span key={check.label} className={`h-1 rounded-full transition-colors ${index < passwordStrength ? strengthColor : "bg-border"}`} />
                  ))}
                </div>
                {password && (
                  <span aria-live="polite" className={passwordStrength === 4 ? "font-medium text-emerald-700" : passwordStrength >= 2 ? "font-medium text-amber-700" : "text-muted-foreground"}>
                    {strengthLabel}
                  </span>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={check.passed ? "flex items-center gap-1 text-emerald-700" : "flex items-center gap-1 text-muted-foreground"}>
                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passwordConfirmation">ยืนยันรหัสผ่าน</Label>
            <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
      </section>

      {state && !state.ok && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SubmitButton size="lg" pendingText="กำลังส่งคำขอ..." className="mt-1 w-full">สมัครและส่งขออนุมัติ</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว? <Link href="/login" className="font-medium text-primary hover:underline">เข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}
