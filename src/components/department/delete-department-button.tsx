"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDepartmentAction } from "@/actions/department.action";

export function DeleteDepartmentButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("ยืนยันการลบแผนกนี้?")) return;

    startTransition(async () => {
      const result = await deleteDepartmentAction(id);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.message);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" title="ลบแผนก" disabled={isPending} onClick={handleDelete} type="button">
      <Trash2 className="h-4 w-4 text-rose-600" />
    </Button>
  );
}
