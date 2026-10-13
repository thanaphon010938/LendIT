"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reportUnitBrokenAction } from "@/actions/equipment-issue.action";
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
import { approveLoanAction, rejectLoanAction } from "@/actions/loan.action";
import { cn } from "@/lib/utils";

export type ApprovableUnit = { id: string; assetTag: string; serialNumber: string | null };

export type ApproveLine = {
  loanId: string;
  name: string;
  code: string;
  quantity: number;
  trackUnits: boolean;
  /** AVAILABLE devices of this model the admin can hand over. */
  availableUnits: ApprovableUnit[];
};

const initialSelection = (lines: ApproveLine[]) =>
  Object.fromEntries(
    lines.filter((l) => l.trackUnits).map((l) => [l.loanId, l.availableUnits.slice(0, l.quantity).map((u) => u.id)])
  ) as Record<string, string[]>;

export function ApproveLoanButton({
  lines,
  borrowerName,
  defaultOpen = false,
}: {
  lines: ApproveLine[];
  borrowerName: string;
  /** Open on mount, e.g. right after an admin created this request at the counter. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState(() => initialSelection(lines));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  // Devices reported broken in this dialog; hidden right away, before the page data refreshes.
  const [broken, setBroken] = useState<string[]>([]);
  const [reporting, setReporting] = useState<{ loanId: string; unit: ApprovableUnit } | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState("");
  const [isReporting, startReporting] = useTransition();

  const [dropNote, setDropNote] = useState<string | null>(null);

  const unitsFor = (line: ApproveLine) => line.availableUnits.filter((u) => !broken.includes(u.id));
  // Lines with not enough working devices left: they can't be handed over and are declined with a note.
  const shortLines = lines.filter((l) => l.trackUnits && unitsFor(l).length < l.quantity);
  const shortIds = new Set(shortLines.map((l) => l.loanId));
  const allShort = shortLines.length === lines.length;
  const defaultDropNote = `${shortLines.map((l) => l.name).join(", ")} เครื่องเสียกะทันหัน ไม่มีเครื่องสำรองทดแทน`;
  const note = dropNote ?? defaultDropNote;
  const incomplete = lines.some(
    (l) => l.trackUnits && !shortIds.has(l.loanId) && (selected[l.loanId]?.length ?? 0) !== l.quantity
  );

  function reportBroken() {
    if (!reporting) return;
    const { loanId, unit } = reporting;
    setReportError("");
    startReporting(async () => {
      const result = await reportUnitBrokenAction(unit.id, reportNote);
      if (!result.ok) {
        setReportError(result.message);
        return;
      }
      const line = lines.find((l) => l.loanId === loanId)!;
      const remaining = unitsFor(line).filter((u) => u.id !== unit.id);
      setBroken((prev) => [...prev, unit.id]);
      // Swap in the next free device so the admin can carry on approving.
      setSelected((prev) => {
        const kept = (prev[loanId] ?? []).filter((id) => id !== unit.id);
        const replacement = remaining.find((u) => !kept.includes(u.id));
        return { ...prev, [loanId]: replacement && kept.length < line.quantity ? [...kept, replacement.id] : kept };
      });
      setReporting(null);
      setReportNote("");
      router.refresh();
    });
  }

  function toggle(line: ApproveLine, unitId: string) {
    setSelected((prev) => {
      const current = prev[line.loanId] ?? [];
      if (current.includes(unitId)) return { ...prev, [line.loanId]: current.filter((id) => id !== unitId) };
      // At capacity: swap out the oldest pick so a single click still selects the clicked device.
      const next = current.length >= line.quantity ? [...current.slice(1), unitId] : [...current, unitId];
      return { ...prev, [line.loanId]: next };
    });
  }

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = allShort
        ? await rejectLoanAction(lines.map((l) => l.loanId), note)
        : await approveLoanAction(
            lines.map((l) => l.loanId),
            lines
              .filter((l) => l.trackUnits && !shortIds.has(l.loanId))
              .map((l) => ({ loanId: l.loanId, unitIds: selected[l.loanId] ?? [] })),
            shortLines.length > 0 ? { loanIds: shortLines.map((l) => l.loanId), reason: note } : undefined
          );
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
        setReporting(null);
        if (next) {
          setBroken([]);
          setDropNote(null);
          setSelected(initialSelection(lines));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="success" className="gap-1.5">
          <Check className="h-4 w-4" />
          อนุมัติ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Check className="h-5 w-5" />
          </div>
          <DialogTitle>อนุมัติคำขอยืม</DialogTitle>
          <DialogDescription>ผู้ยืม {borrowerName} · เลือกเครื่องที่จะส่งมอบให้ครบทุกรายการ</DialogDescription>
        </DialogHeader>

        {lines.some((l) => l.trackUnits) && (
          <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              ตรวจเครื่องก่อนส่งมอบ ถ้าเครื่องไหนเปิดไม่ติดหรือชำรุด กด <span className="font-medium text-foreground">แจ้งเสีย</span> ระบบจะส่งเข้ารายการรอซ่อมและเลือกเครื่องอื่นให้
            </span>
          </p>
        )}

        <div className="space-y-3">
          {lines.map((line) => {
            const picked = selected[line.loanId] ?? [];
            const units = unitsFor(line);
            const shortage = line.trackUnits && units.length < line.quantity;
            return (
              <div key={line.loanId} className="rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{line.code}</p>
                  </div>
                  {shortage ? (
                    <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">ไม่มีเครื่องทดแทน</span>
                  ) : line.trackUnits ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        picked.length === line.quantity ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}
                    >
                      เลือกแล้ว {picked.length}/{line.quantity} เครื่อง
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">{line.quantity} ชิ้น</span>
                  )}
                </div>

                {line.trackUnits &&
                  (shortage ? (
                    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                      ไม่มีเครื่องทดแทน (ว่าง {units.length} จาก {line.quantity} เครื่องที่ขอ) รายการนี้จะไม่ได้รับอนุมัติ และแจ้งผู้ยืมตามหมายเหตุด้านล่าง
                    </p>
                  ) : (
                    <ul className="mt-2.5 divide-y divide-border overflow-hidden rounded-md border border-border">
                      {units.map((unit) => {
                        const active = picked.includes(unit.id);
                        const isReportingThis = reporting?.unit.id === unit.id;
                        return (
                          <li key={unit.id} className={cn(active && "bg-primary/[0.06]")}>
                            <div className="flex items-center gap-2 pr-1.5">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={active}
                                onClick={() => toggle(line, unit.id)}
                                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                    active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-card"
                                  )}
                                  aria-hidden="true"
                                >
                                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                <span className={cn("font-mono text-sm", active ? "font-semibold text-foreground" : "text-foreground/80")}>
                                  {unit.assetTag}
                                </span>
                                <span className="truncate font-mono text-xs text-muted-foreground">
                                  {unit.serialNumber ? `S/N ${unit.serialNumber}` : "ไม่มี Serial"}
                                </span>
                              </button>
                              {!isReportingThis && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReporting({ loanId: line.loanId, unit });
                                    setReportNote("");
                                    setReportError("");
                                  }}
                                  aria-label={`แจ้งว่า ${unit.assetTag} เสีย`}
                                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  แจ้งเสีย
                                </button>
                              )}
                            </div>

                            {isReportingThis && (
                              <div className="space-y-2 border-t border-rose-200 bg-rose-50/70 px-3 py-2.5">
                                <p className="text-xs text-rose-800">
                                  <span className="font-semibold">เครื่องนี้มีปัญหาอะไร?</span> จะส่งเข้ารายการรอซ่อม และเลือกเครื่องอื่นให้แทน
                                </p>
                                <div className="flex gap-2">
                                  <Input
                                    autoFocus
                                    value={reportNote}
                                    onChange={(e) => setReportNote(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && reportNote.trim().length >= 3 && reportBroken()}
                                    placeholder="เช่น เปิดไม่ติด, จอแตก"
                                    maxLength={500}
                                    className="h-8 flex-1 bg-card text-sm"
                                    aria-label={`อาการเสียของ ${unit.assetTag}`}
                                  />
                                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setReporting(null)} disabled={isReporting}>
                                    ยกเลิก
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="h-8"
                                    onClick={reportBroken}
                                    disabled={isReporting || reportNote.trim().length < 3}
                                  >
                                    {isReporting ? "กำลังบันทึก..." : "ส่งซ่อม"}
                                  </Button>
                                </div>
                                {reportError && <p className="text-xs text-rose-700">{reportError}</p>}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ))}
              </div>
            );
          })}
        </div>

        {shortLines.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
            <label htmlFor="drop-note" className="text-sm font-medium text-rose-900">
              หมายเหตุถึงผู้ยืม
            </label>
            <Textarea
              id="drop-note"
              value={note}
              onChange={(e) => setDropNote(e.target.value)}
              maxLength={500}
              className="min-h-[64px] bg-card text-sm"
            />
            <p className="text-xs text-rose-800/80">
              {allShort
                ? "คำขอนี้จะถูกปฏิเสธ ผู้ยืมจะเห็นหมายเหตุนี้ในรายการของตน"
                : `รายการที่ไม่มีเครื่องจะถูกแยกออกและแจ้งผู้ยืมด้วยหมายเหตุนี้ ส่วนรายการอื่นอนุมัติตามปกติ`}
            </p>
          </div>
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
            variant={allShort ? "destructive" : "success"}
            onClick={handleConfirm}
            disabled={isPending || incomplete || (shortLines.length > 0 && note.trim().length < 3)}
          >
            {isPending
              ? "กำลังบันทึก..."
              : allShort
                ? "ไม่อนุมัติคำขอ"
                : shortLines.length > 0
                  ? `อนุมัติเฉพาะที่มีเครื่อง (${lines.length - shortLines.length} รายการ)`
                  : "ยืนยันอนุมัติ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
