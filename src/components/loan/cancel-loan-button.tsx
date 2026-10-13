"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
import { cancelLoanAction } from "@/actions/loan.action";

export function CancelLoanButton({ loanIds, itemSummary }: { loanIds: string[]; itemSummary: string[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelLoanAction(loanIds);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); setError(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">ยกเลิกคำขอ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยืนยันยกเลิกคำขอยืม</DialogTitle>
          <DialogDescription>รายการอุปกรณ์ทั้งหมดในคำขอนี้จะถูกยกเลิก</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          {itemSummary.map((item) => <p key={item} className="text-sm">{item}</p>)}
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>กลับ</Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleCancel}>
            {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
