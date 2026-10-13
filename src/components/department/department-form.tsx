"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { createDepartmentAction, updateDepartmentAction } from "@/actions/department.action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

export function DepartmentForm({ department }: { department?: { id: string; code: string; name: string } | null }) {
  const action = department ? updateDepartmentAction : createDepartmentAction;
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {department && <input type="hidden" name="id" value={department.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">รหัสแผนก</Label>
        <Input id="code" name="code" defaultValue={department?.code ?? ""} placeholder="เช่น LIBRARY" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">ชื่อแผนก</Label>
        <Input id="name" name="name" defaultValue={department?.name ?? ""} placeholder="เช่น แผนกห้องสมุด" required />
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

      <div className="flex items-center gap-2">
        <SubmitButton pendingText={department ? "กำลังบันทึก..." : "กำลังเพิ่ม..."} className="group w-fit gap-1.5">
          {!department && <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />}
          {department ? "บันทึกการแก้ไข" : "เพิ่มแผนก"}
        </SubmitButton>

        {department && (
          <Button asChild variant="outline" type="button">
            <Link href="/admin/departments">ยกเลิก</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
