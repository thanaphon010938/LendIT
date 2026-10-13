"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteEquipmentAction } from "@/actions/equipment.action";

/** Only offered for models with no loan/repair history; anything used is retired instead. */
export function DeleteEquipmentButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteEquipmentAction(id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-rose-600"
          title="ลบ"
          aria-label={`ลบ ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบ {name}</DialogTitle>
          <DialogDescription>
            อุปกรณ์นี้ยังไม่เคยถูกยืม จึงลบได้ (เช่น กรณีเพิ่มผิด) รายการเครื่องทั้งหมดของรุ่นนี้จะถูกลบด้วย ย้อนกลับไม่ได้
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "กำลังลบ..." : "ยืนยันลบ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
