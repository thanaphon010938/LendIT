"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { addDays, formatThaiDate, toDateKey } from "@/lib/thai-date";

/** Inclusive local-day range as `YYYY-MM-DD` strings; an empty string means that side is open. */
export type DateRange = { from: string; to: string };

/** True when `date` falls within the inclusive local-day range (empty bounds are open). */
export function isInDateRange(date: Date | string, { from, to }: DateRange) {
  const time = new Date(date).getTime();
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

function rangeLabel({ from, to }: DateRange) {
  if (from && to) return from === to ? formatThaiDate(from) : `${formatThaiDate(from)} – ${formatThaiDate(to)}`;
  if (from) return `ตั้งแต่ ${formatThaiDate(from)}`;
  if (to) return `ถึง ${formatThaiDate(to)}`;
  return "ทุกช่วงวันที่";
}

function presets(): { label: string; range: DateRange }[] {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  return [
    { label: "วันนี้", range: { from: toDateKey(today), to: toDateKey(today) } },
    { label: "7 วันล่าสุด", range: { from: toDateKey(addDays(today, -6)), to: toDateKey(today) } },
    { label: "30 วันล่าสุด", range: { from: toDateKey(addDays(today, -29)), to: toDateKey(today) } },
    { label: "เดือนนี้", range: { from: toDateKey(monthStart), to: toDateKey(today) } },
    { label: "เดือนที่แล้ว", range: { from: toDateKey(lastMonthStart), to: toDateKey(lastMonthEnd) } },
  ];
}

export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (value: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = Boolean(value.from || value.to);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // While picking the end date, preview the range under the cursor.
  const pickingEnd = Boolean(value.from && !value.to);
  const previewTo = pickingEnd && hoverKey && hoverKey >= value.from ? hoverKey : value.to;

  function selectDay(key: string) {
    if (!value.from || value.to || key < value.from) {
      onChange({ from: key, to: "" });
      return;
    }
    onChange({ from: value.from, to: key });
    setOpen(false);
  }

  function applyPreset(range: DateRange) {
    onChange(range);
    setCalendarKey((current) => current + 1); // jump the calendar to the preset's month
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex h-10 items-center rounded-lg border bg-card shadow-soft transition-colors",
          open ? "border-ring ring-2 ring-ring/30" : "border-input hover:border-foreground/30",
          active && !open && "border-primary/40 bg-primary/5"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex h-full items-center gap-2 pl-3 pr-2 text-sm"
        >
          <CalendarDays className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
          <span className="text-muted-foreground">วันที่ยืม</span>
          <span className={cn("font-medium tabular-nums", active ? "text-primary" : "text-foreground")}>{rangeLabel(value)}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ from: "", to: "" })}
            aria-label="ล้างช่วงวันที่"
            className="mr-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงวันที่ยืม"
          className="absolute left-0 top-full z-50 mt-2 flex w-max max-w-[calc(100vw-2rem)] animate-fade-in flex-col overflow-hidden rounded-xl border border-border bg-card shadow-popover sm:flex-row"
        >
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-muted/40 p-2 sm:w-36 sm:flex-col sm:border-b-0 sm:border-r">
            {presets().map((preset) => {
              const selected = preset.range.from === value.from && preset.range.to === value.to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.range)}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-card hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="w-[19rem] p-3">
            <Calendar
              key={calendarKey}
              from={value.from || undefined}
              to={previewTo || undefined}
              onSelect={selectDay}
              onHoverDay={setHoverKey}
            />
            <p className="mt-2 border-t border-border pt-2 text-center text-xs text-muted-foreground">
              {pickingEnd ? "เลือกวันสิ้นสุด" : "เลือกวันเริ่มต้น"} · {rangeLabel({ from: value.from, to: previewTo })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
