"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { createCategoryAction, renameCategoryAction } from "@/actions/category.action";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label, RequiredMark } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertCircle } from "lucide-react";

type CategoryTarget = { id: string; name: string };

function CategoryForm({ category, onDone }: { category?: CategoryTarget; onDone: () => void }) {
  const [state, formAction] = useFormState(category ? renameCategoryAction : createCategoryAction, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">
          ชื่อประเภทอุปกรณ์
          <RequiredMark />
        </Label>
        <Input id="category-name" name="name" defaultValue={category?.name} placeholder="เช่น Keyboard" autoFocus required />
      </div>

      {state && !state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SubmitButton pendingText="กำลังบันทึก..." className="w-full sm:w-fit sm:self-end">
        {category ? "บันทึกชื่อใหม่" : "เพิ่มประเภทอุปกรณ์"}
      </SubmitButton>
    </form>
  );
}

/** Dialog for creating a category, or renaming one when `category` is given. */
export function CategoryDialog({ category, trigger }: { category?: CategoryTarget; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? `เปลี่ยนชื่อประเภท “${category.name}”` : "เพิ่มประเภทอุปกรณ์"}</DialogTitle>
          <DialogDescription>
            {category ? "ชื่อใหม่จะแสดงกับอุปกรณ์ทุกชิ้นในประเภทนี้" : "ใช้แยกหมวดหมู่อุปกรณ์ในหน้าคลังและหน้ายืมอุปกรณ์"}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm category={category} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
