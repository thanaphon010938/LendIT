"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewExtensionAction } from "@/actions/loan.action";
import { formatDate } from "@/lib/utils";

/** Pending extension request banner on an admin loan card, with approve / reject. */
export function ReviewExtension({
  loanIds,
  currentDueDate,
  requestedDueDate,
  reason,
}: {
  loanIds: string[];
  currentDueDate: Date;
  requestedDueDate: Date;
  reason: string | null;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const extraDays = Math.round((new Date(requestedDueDate).getTime() - new Date(currentDueDate).getTime()) / 86_400_000);

  function review(approve: boolean) {
    setError("");
    startTransition(async () => {
      const result = await reviewExtensionAction(loanIds, approve, rejectReason);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRejecting(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-amber-900">
              ขอขยายเวลาถึง {formatDate(requestedDueDate)}{" "}
              <span className="font-normal text-amber-800">(+{extraDays} วัน จาก {formatDate(currentDueDate)})</span>
            </p>
            {reason && <p className="mt-0.5 text-xs text-amber-800">เหตุผล: {reason}</p>}
          </div>
        </div>
        {!rejecting && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 bg-card" disabled={isPending} onClick={() => setRejecting(true)}>
              ไม่อนุมัติ
            </Button>
            <Button type="button" size="sm" variant="success" className="h-8 gap-1" disabled={isPending} onClick={() => review(true)}>
              <Check className="h-4 w-4" />
              {isPending ? "กำลังบันทึก..." : "อนุมัติขยายเวลา"}
            </Button>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="mt-2.5 flex gap-2">
          <Input
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เหตุผลที่ไม่อนุมัติ เช่น มีคิวยืมต่อแล้ว"
            maxLength={500}
            className="h-8 flex-1 bg-card text-sm"
            aria-label="เหตุผลที่ไม่อนุมัติการขยายเวลา"
          />
          <Button type="button" size="sm" variant="ghost" className="h-8" disabled={isPending} onClick={() => setRejecting(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8"
            disabled={isPending || rejectReason.trim().length < 3}
            onClick={() => review(false)}
          >
            {isPending ? "กำลังบันทึก..." : "ยืนยันไม่อนุมัติ"}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
