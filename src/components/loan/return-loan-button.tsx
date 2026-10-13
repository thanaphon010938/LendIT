"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ReturnCondition } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { returnLoanAction } from "@/actions/loan.action";
import { RETURN_CONDITIONS } from "@/lib/return-condition";
import { cn } from "@/lib/utils";

type ReturnUnit = { id: string; assetTag: string; serialNumber: string | null };
type ReturnItem = { id: string; name: string; code: string; quantity: number; units: ReturnUnit[] };
type RowState = { condition: ReturnCondition; affectedQuantity: number; note: string };

/** One row per device for asset-tracked lines, one row per line for stock-count lines. */
const rowKey = (itemId: string, unitId?: string) => (unitId ? `${itemId}:${unitId}` : itemId);

const initialState = (items: ReturnItem[]) => {
  const state: Record<string, RowState> = {};
  for (const item of items) {
    if (item.units.length > 0) {
      for (const unit of item.units) state[rowKey(item.id, unit.id)] = { condition: "NORMAL", affectedQuantity: 1, note: "" };
    } else {
      state[rowKey(item.id)] = { condition: "NORMAL", affectedQuantity: item.quantity, note: "" };
    }
  }
  return state;
};

function ConditionRow({
  title,
  subtitle,
  row,
  maxQuantity,
  onChange,
}: {
  title: string;
  subtitle: string;
  row: RowState;
  /** Stock-count lines with several units ask how many are affected. */
  maxQuantity?: number;
  onChange: (patch: Partial<RowState>) => void;
}) {
  const selected = RETURN_CONDITIONS.find((c) => c.value === row.condition)!;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Select
          value={row.condition}
          onChange={(event) => onChange({ condition: event.target.value as ReturnCondition })}
          aria-label={`สภาพของ ${title}`}
          className="w-32 shrink-0"
          selectClassName={cn("h-9 py-0 font-medium", selected.className)}
        >
          {RETURN_CONDITIONS.map((condition) => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </Select>
      </div>

      {row.condition !== "NORMAL" && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{selected.hint}</p>
          <div className="flex gap-2">
            <Input
              value={row.note}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="รายละเอียด เช่น จอมีรอยร้าว, เปิดไม่ติด"
              maxLength={500}
              className="h-9 flex-1"
              aria-label={`รายละเอียดสภาพของ ${title}`}
            />
            {maxQuantity !== undefined && maxQuantity > 1 && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={row.affectedQuantity}
                  onChange={(event) =>
                    onChange({ affectedQuantity: Math.min(maxQuantity, Math.max(1, Number(event.target.value) || 1)) })
                  }
                  className="h-9 w-16"
                  aria-label="จำนวนที่มีปัญหา"
                />
                <span className="text-xs text-muted-foreground">/ {maxQuantity} ชิ้น</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReturnLoanButton({ items, borrowerName }: { items: ReturnItem[]; borrowerName: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => initialState(items));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const update = (key: string, patch: Partial<RowState>) => setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const rows = Object.values(state);
  const missingNote = rows.some((row) => row.condition !== "NORMAL" && row.note.trim().length < 3);
  const problemCount = rows.filter((row) => row.condition !== "NORMAL").length;

  function handleConfirm() {
    setError("");
    if (missingNote) {
      setError("กรุณาระบุรายละเอียดของรายการที่สภาพไม่ปกติ");
      return;
    }
    startTransition(async () => {
      const result = await returnLoanAction(
        items.map((item) => item.id),
        items.map((item) =>
          item.units.length > 0
            ? {
                loanId: item.id,
                condition: "NORMAL",
                affectedQuantity: 1,
                note: "",
                units: item.units.map((unit) => ({ unitId: unit.id, ...pick(state[rowKey(item.id, unit.id)]) })),
              }
            : { loanId: item.id, ...state[rowKey(item.id)] }
        )
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
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setError("");
        if (nextOpen) setState(initialState(items));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          บันทึกคืน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RotateCcw className="h-5 w-5" />
          </div>
          <DialogTitle>บันทึกรับคืนอุปกรณ์</DialogTitle>
          <DialogDescription>ผู้ยืม {borrowerName} · ตรวจสภาพทีละเครื่องก่อนบันทึก</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((item) =>
            item.units.length > 0 ? (
              <div key={item.id} className="rounded-lg border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {item.name} <span className="font-normal text-muted-foreground">· {item.units.length} เครื่อง</span>
                </p>
                <div className="divide-y divide-border">
                  {item.units.map((unit) => (
                    <div key={unit.id} className="p-3">
                      <ConditionRow
                        title={unit.assetTag}
                        subtitle={unit.serialNumber ? `S/N ${unit.serialNumber}` : "ยังไม่ได้บันทึก Serial"}
                        row={state[rowKey(item.id, unit.id)]}
                        onChange={(patch) => update(rowKey(item.id, unit.id), patch)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <ConditionRow
                  title={item.name}
                  subtitle={`${item.code} · ${item.quantity} ชิ้น`}
                  row={state[rowKey(item.id)]}
                  maxQuantity={item.quantity}
                  onChange={(patch) => update(rowKey(item.id), patch)}
                />
              </div>
            )
          )}
        </div>

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
          <Button type="button" onClick={handleConfirm} disabled={isPending || missingNote}>
            {isPending ? "กำลังบันทึก..." : problemCount > 0 ? `ยืนยันรับคืน (มีปัญหา ${problemCount} รายการ)` : "ยืนยันรับคืน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const pick = (row: RowState) => ({ condition: row.condition, note: row.note });
