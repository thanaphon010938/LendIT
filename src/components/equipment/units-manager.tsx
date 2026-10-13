"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UnitStatus } from "@prisma/client";
import { AlertCircle, Archive, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { addUnitsAction, retireUnitAction, setUnitHeldAction, updateUnitAction } from "@/actions/equipment.action";
import type { ActionResult } from "@/actions/equipment.action";
import { cn, formatDate } from "@/lib/utils";

export type ManagedUnit = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  status: UnitStatus;
  note: string | null;
  holder: { name: string; dueDate: Date } | null;
  loanCount: number;
};

export const UNIT_STATUS: Record<UnitStatus, { label: string; className: string }> = {
  AVAILABLE: { label: "ว่าง", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  HELD: { label: "เก็บไว้ ไม่ให้ยืม", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  ON_LOAN: { label: "ถูกยืม", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  IN_REPAIR: { label: "รอซ่อม", className: "bg-rose-50 text-rose-700 ring-rose-200" },
  LOST: { label: "สูญหาย", className: "bg-slate-100 text-slate-700 ring-slate-300" },
  RETIRED: { label: "ปลดระวาง", className: "bg-slate-50 text-slate-400 ring-slate-200" },
};

function useAction() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, onDone: () => void) => {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onDone();
      router.refresh();
    });
  };
  return { error, setError, isPending, run };
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

function AddUnitsDialog({ equipmentId, code }: { equipmentId: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [serial, setSerial] = useState("");
  const { error, setError, isPending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); if (next) { setCount(1); setSerial(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="group gap-1.5">
          <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          เพิ่มเครื่อง
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเครื่องใหม่</DialogTitle>
          <DialogDescription>ระบบจะสร้างรหัสครุภัณฑ์ต่อจากเครื่องล่าสุดให้ เช่น {code}-03</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-count">จำนวน</Label>
            <Input id="unit-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-serial">Serial Number</Label>
            <Input
              id="unit-serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              disabled={count > 1}
              placeholder={count > 1 ? "ใส่ทีละเครื่องหลังเพิ่ม" : "ไม่บังคับ"}
            />
          </div>
        </div>
        <ErrorNote message={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
          </DialogClose>
          <Button type="button" disabled={isPending} onClick={() => run(() => addUnitsAction(equipmentId, count, serial), () => setOpen(false))}>
            {isPending ? "กำลังเพิ่ม..." : `เพิ่ม ${count} เครื่อง`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUnitDialog({ unit }: { unit: ManagedUnit }) {
  const [open, setOpen] = useState(false);
  const [assetTag, setAssetTag] = useState(unit.assetTag);
  const [serial, setSerial] = useState(unit.serialNumber ?? "");
  const [note, setNote] = useState(unit.note ?? "");
  const [held, setHeld] = useState(unit.status === "HELD");
  const { error, setError, isPending, run } = useAction();
  const canHold = unit.status === "AVAILABLE" || unit.status === "HELD";

  async function save(): Promise<ActionResult> {
    const result = await updateUnitAction(unit.id, { assetTag, serialNumber: serial, note });
    if (!result.ok || !canHold || held === (unit.status === "HELD")) return result;
    return setUnitHeldAction(unit.id, held);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError("");
        if (next) { setAssetTag(unit.assetTag); setSerial(unit.serialNumber ?? ""); setNote(unit.note ?? ""); setHeld(unit.status === "HELD"); }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`แก้ไข ${unit.assetTag}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลเครื่อง</DialogTitle>
          <DialogDescription>{unit.assetTag}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-tag">รหัสครุภัณฑ์</Label>
              <Input id="edit-tag" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-serial">Serial Number</Label>
              <Input id="edit-serial" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="เช่น 5CD1234XYZ" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note">หมายเหตุ</Label>
            <Textarea id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[64px]" placeholder="เช่น เครื่องสำรองห้องประชุมใหญ่" />
          </div>
          {canHold && (
            <label htmlFor="edit-held" className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
              <input
                id="edit-held"
                type="checkbox"
                checked={held}
                onChange={(e) => setHeld(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span>
                <span className="font-medium">เก็บไว้ ไม่ให้ยืม</span>
                <span className="block text-xs text-muted-foreground">
                  เครื่องนี้จะไม่นับเป็นเครื่องว่าง และไม่ขึ้นให้เลือกตอนอนุมัติ เครื่องอื่นของรุ่นนี้ยังยืมได้ตามปกติ
                </span>
              </span>
            </label>
          )}
        </div>
        <ErrorNote message={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
          </DialogClose>
          <Button type="button" disabled={isPending} onClick={() => run(save, () => setOpen(false))}>
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetireUnitDialog({ unit }: { unit: ManagedUnit }) {
  const [open, setOpen] = useState(false);
  const { error, setError, isPending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600" aria-label={`ปลดระวาง ${unit.assetTag}`}>
          <Archive className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ปลดระวาง {unit.assetTag}</DialogTitle>
          <DialogDescription>เครื่องนี้จะไม่ถูกนับเป็นของในคลังและให้ยืมไม่ได้อีก ประวัติการยืมยังเก็บไว้</DialogDescription>
        </DialogHeader>
        <ErrorNote message={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => retireUnitAction(unit.id), () => setOpen(false))}>
            {isPending ? "กำลังบันทึก..." : "ยืนยันปลดระวาง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnitsManager({ equipmentId, code, units }: { equipmentId: string; code: string; units: ManagedUnit[] }) {
  const [showRetired, setShowRetired] = useState(false);
  const retiredCount = units.filter((u) => u.status === "RETIRED").length;
  const visible = showRetired ? units : units.filter((u) => u.status !== "RETIRED");
  const missingSerial = units.filter((u) => u.status !== "RETIRED" && !u.serialNumber).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {missingSerial > 0 ? (
            <span className="text-amber-700">ยังไม่ได้ใส่ Serial {missingSerial} เครื่อง</span>
          ) : (
            "ทุกเครื่องมี Serial ครบ"
          )}
          {retiredCount > 0 && (
            <button type="button" onClick={() => setShowRetired((v) => !v)} className="ml-3 text-primary hover:underline">
              {showRetired ? "ซ่อนเครื่องที่ปลดระวาง" : `แสดงเครื่องที่ปลดระวาง (${retiredCount})`}
            </button>
          )}
        </p>
        <AddUnitsDialog equipmentId={equipmentId} code={code} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">รหัสครุภัณฑ์</th>
              <th className="px-4 py-2.5 font-medium">Serial Number</th>
              <th className="px-4 py-2.5 font-medium">สถานะ</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">ผู้ถือ / หมายเหตุ</th>
              <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">ยืมไปแล้ว</th>
              <th className="w-20 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((unit) => (
              <tr key={unit.id} className={cn(unit.status === "RETIRED" && "opacity-60")}>
                <td className="px-4 py-2.5 font-mono font-medium">{unit.assetTag}</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{unit.serialNumber ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", UNIT_STATUS[unit.status].className)}>
                    {UNIT_STATUS[unit.status].label}
                  </span>
                </td>
                <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                  {unit.holder ? (
                    <>
                      <span className="font-medium text-foreground">{unit.holder.name}</span> · คืน {formatDate(unit.holder.dueDate)}
                    </>
                  ) : (
                    unit.note ?? ""
                  )}
                </td>
                <td className="hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">{unit.loanCount} ครั้ง</td>
                <td className="px-2 py-1.5">
                  {unit.status !== "RETIRED" && (
                    <div className="flex justify-end">
                      <EditUnitDialog unit={unit} />
                      {(unit.status === "AVAILABLE" || unit.status === "HELD") && <RetireUnitDialog unit={unit} />}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีเครื่องในระบบ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
