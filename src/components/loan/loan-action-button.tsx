"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Undo2, X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  rejectLoanAction,
  revokeApprovalAction,
} from "@/actions/loan.action";
import type { ActionResult } from "@/actions/equipment.action";

type LoanActionButtonProps = {
  loanIds: string[];
  itemSummary: string[];
  borrowerName: string;
  itemCount: number;
} & (
  | { kind: "reject"; variant?: ButtonProps["variant"] }
  | { kind: "revoke"; variant?: ButtonProps["variant"] }
);

const actionCopy = {
  reject: {
    label: "ปฏิเสธ",
    pending: "กำลังปฏิเสธ...",
    title: "ปฏิเสธคำขอยืม",
    description: "โปรดตรวจสอบรายการและระบุเหตุผล ผู้ยืมจะเห็นเหตุผลนี้",
    confirm: "ยืนยันปฏิเสธ",
    icon: X,
    confirmVariant: "destructive" as const,
  },
  revoke: {
    label: "ยกเลิกการอนุมัติ",
    pending: "กำลังยกเลิก...",
    title: "ยกเลิกการอนุมัติ",
    description: "คำขอจะกลับไปเป็นรออนุมัติ จากนั้นอนุมัติใหม่หรือปฏิเสธได้ตามปกติ",
    confirm: "ยืนยันยกเลิกการอนุมัติ",
    icon: Undo2,
    confirmVariant: "destructive" as const,
  },
};

export function LoanActionButton(props: LoanActionButtonProps) {
  const { loanIds, itemSummary, borrowerName, itemCount, kind } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const copy = actionCopy[kind];
  const Icon = copy.icon;

  function handleConfirm() {
    setError("");
    if ((kind === "reject" || kind === "revoke") && reason.trim().length < 3) {
      setError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }

    startTransition(async () => {
      let result: ActionResult;
      if (kind === "reject") result = await rejectLoanAction(loanIds, reason);
      else result = await revokeApprovalAction(loanIds, reason);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); setError(""); }}>
      <DialogTrigger asChild>
        <Button variant={props.variant} size="sm" className="gap-1.5">
          {kind !== "reject" && <Icon className="h-4 w-4" />}
          {copy.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">ผู้ยืม</span>
            <span className="font-medium">{borrowerName}</span>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            {itemSummary.map((item) => <p key={item} className="text-sm">{item}</p>)}
            <p className="text-xs text-muted-foreground">{itemCount} รายการในคำขอนี้</p>
          </div>
        </div>

        {kind === "reject" && (
          <div className="space-y-1.5">
            <label htmlFor="rejection-reason" className="text-sm font-medium">เหตุผลที่ปฏิเสธ</label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="ระบุเหตุผลเพื่อแจ้งให้ผู้ยืมทราบ"
              maxLength={500}
              required
            />
          </div>
        )}

        {kind === "revoke" && (
          <>
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ใช้เมื่ออนุมัติผิดเท่านั้น ถ้าผู้ยืมรับอุปกรณ์ไปแล้ว ให้ใช้ &quot;บันทึกคืน&quot; เมื่อได้ของคืนแทน
            </p>
            <div className="space-y-1.5">
              <label htmlFor="revoke-reason" className="text-sm font-medium">เหตุผลที่ยกเลิกการอนุมัติ</label>
              <Textarea
                id="revoke-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="เช่น กดอนุมัติผิดคำขอ"
                maxLength={500}
                required
              />
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>กลับไปตรวจสอบ</Button>
          </DialogClose>
          <Button
            type="button"
            variant={copy.confirmVariant}
            onClick={handleConfirm}
            disabled={isPending || ((kind === "reject" || kind === "revoke") && reason.trim().length < 3)}
          >
            {isPending ? copy.pending : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}