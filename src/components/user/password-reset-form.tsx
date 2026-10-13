"use client";

import { useFormState } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { resetOwnPasswordAction } from "@/actions/user.action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/actions/equipment.action";

export function PasswordResetForm() {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(resetOwnPasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">ยืนยันตัวตนด้วยบัญชีที่เข้าสู่ระบบ ไม่ต้องกรอกรหัสผ่านเดิม</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-confirmation">ยืนยันรหัสผ่านใหม่</Label>
        <Input id="password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      </div>
      {state && !state.ok && <p role="alert" className="flex items-center gap-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{state.message}</p>}
      {state?.ok && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{state.message}</p>}
      <SubmitButton pendingText="กำลังเปลี่ยน..." className="w-fit">ตั้งรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}