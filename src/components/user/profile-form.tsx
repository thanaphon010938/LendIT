"use client";

import { useFormState } from "react-dom";
import { updateProfileAction } from "@/actions/user.action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Department, Role } from "@prisma/client";

export function ProfileForm({
  role,
  departmentId,
  itDepartment,
  departments,
  phone,
}: {
  role: Role;
  departmentId: string;
  itDepartment: Department;
  departments: Department[];
  phone: string | null;
}) {
  const [state, formAction] = useFormState(updateProfileAction, undefined);
  const isAdmin = role === "ADMIN";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="departmentId">แผนก</Label>
        {isAdmin ? (
          <>
            <input type="hidden" name="departmentId" value={itDepartment.id} />
            <div className="flex h-10 items-center rounded-lg border border-input bg-muted/50 px-3.5 text-sm text-muted-foreground">
              {itDepartment.name} (ล็อกไว้สำหรับผู้ดูแลระบบ)
            </div>
          </>
        ) : (
          <Select id="departmentId" name="departmentId" defaultValue={departmentId} required>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">เบอร์ภายในแผนก (ถ้ามี)</Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} placeholder="เช่น 1234" />
      </div>

      {state && !state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}
      {state && state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SubmitButton pendingText="กำลังบันทึก..." className="w-fit">
        บันทึกการเปลี่ยนแปลง
      </SubmitButton>
    </form>
  );
}
