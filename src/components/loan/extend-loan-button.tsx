"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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
import { requestExtensionAction } from "@/actions/loan.action";
import { addDays, fromDateKey, toDateKey } from "@/lib/thai-date";
import { formatDate } from "@/lib/utils";

export function ExtendLoanButton({ loanIds, currentDueDate, itemSummary }: { loanIds: string[]; currentDueDate: Date; itemSummary: string[] }) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Earliest pick: the day after the current due date, but never before tomorrow (overdue loans).
  const currentKey = toDateKey(new Date(currentDueDate));
  const tomorrowKey = toDateKey(addDays(new Date(), 1));
  const dayAfterDue = toDateKey(addDays(fromDateKey(currentKey), 1));
  const minKey = dayAfterDue > tomorrowKey ? dayAfterDue : tomorrowKey;
  const extraDays = (key: string) => Math.round((fromDateKey(key).getTime() - fromDateKey(currentKey).getTime()) / 86_400_000);

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      const result = await requestExtensionAction(loanIds, dueDate, reason);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError("");
        if (next) {
          setDueDate("");
          setReason("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <CalendarPlus className="h-4 w-4" />
          ขอขยายเวลา
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <DialogTitle>ขอขยายเวลายืม</DialogTitle>
          <DialogDescription>กำหนดคืนเดิม {formatDate(currentDueDate)} · ผู้ดูแลจะพิจารณาก่อนเปลี่ยนวันคืนให้</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          {itemSummary.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extend-due">วันคืนใหม่</Label>
          <DatePicker
            id="extend-due"
            name="newDueDate"
            value={dueDate}
            onChange={setDueDate}
            min={minKey}
            describe={(key) => `ขยายเพิ่ม ${extraDays(key)} วัน`}
            placeholder="เลือกวันคืนใหม่"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extend-reason">เหตุผล</Label>
          <Textarea
            id="extend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น งานนำเสนอเลื่อนไปสัปดาห์หน้า"
            maxLength={500}
            className="min-h-[72px]"
          />
        </div>

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
          <Button type="button" onClick={handleSubmit} disabled={isPending || !dueDate || reason.trim().length < 3}>
            {isPending ? "กำลังส่ง..." : "ส่งคำขอขยายเวลา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One-line status of the latest extension request, shown to both borrower and admin. */
export function ExtensionNote({
  loan,
  forAdmin = false,
}: {
  loan: {
    extensionStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
    extensionRequestedDueDate: Date | null;
    extensionReason: string | null;
    extensionRejectReason: string | null;
    extensionReviewedByName: string | null;
    originalDueDate: Date | null;
  };
  forAdmin?: boolean;
}) {
  return (
    <>
      {/* originalDueDate is set on the first approved extension, so this stays true after later requests. */}
      {loan.originalDueDate && (
        <p className="mt-1 text-xs text-emerald-700">
          ✓ ขยายเวลาแล้ว (กำหนดเดิม {formatDate(loan.originalDueDate)})
          {forAdmin && loan.extensionStatus === "APPROVED" && loan.extensionReviewedByName && ` · อนุมัติโดย ${loan.extensionReviewedByName}`}
        </p>
      )}
      {/* Admins get the pending request as an actionable banner instead. */}
      {loan.extensionStatus === "PENDING" && loan.extensionRequestedDueDate && !forAdmin && (
        <p className="mt-1 text-xs text-amber-700">⏳ รออนุมัติขยายเวลาถึง {formatDate(loan.extensionRequestedDueDate)}</p>
      )}
      {loan.extensionStatus === "REJECTED" && (
        <p className="mt-1 text-xs text-rose-700">
          ไม่อนุมัติคำขอขยายเวลาล่าสุด{loan.extensionRejectReason && ` · เหตุผล: ${loan.extensionRejectReason}`}
        </p>
      )}
    </>
  );
}
