"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCategoryAction } from "@/actions/category.action";
import { Trash2 } from "lucide-react";

export function DeleteCategoryButton({ id, name, equipmentCount }: { id: string; name: string; equipmentCount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const blocked = equipmentCount > 0;

  function handleDelete() {
    if (!confirm(`ยืนยันการลบประเภท “${name}”?`)) return;

    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={blocked ? "ลบไม่ได้ ต้องย้ายหรือลบอุปกรณ์ในประเภทนี้ก่อน" : "ลบประเภท"}
      aria-label={`ลบประเภท ${name}`}
      disabled={isPending || blocked}
      onClick={handleDelete}
      className="h-8 w-8"
    >
      <Trash2 className="h-4 w-4 text-rose-600" />
    </Button>
  );
}
