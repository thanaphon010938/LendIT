"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { addDays, daysFromToday, formatThaiDate, toDateKey } from "@/lib/thai-date";

export type DatePreset = { label: string; days: number };

/**
 * Single-date picker shown as dd/mm/พ.ศ. Submits `YYYY-MM-DD` through a hidden input
 * named `name`, so it drops into server-action forms.
 */
export function DatePicker({
  id,
  name,
  value,
  onChange,
  min,
  presets = [],
  describe,
  placeholder = "เลือกวันที่",
  className,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  presets?: DatePreset[];
  /** Extra text after the date, e.g. "ยืม 7 วัน". */
  describe?: (value: string) => string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  function pick(key: string) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        onClick={() => {
          // Open upward when there isn't room for the calendar below the field.
          const rect = rootRef.current?.getBoundingClientRect();
          if (rect) setOpenUp(window.innerHeight - rect.bottom < 440 && rect.top > window.innerHeight - rect.bottom);
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-lg border bg-card px-3.5 text-left text-sm shadow-soft transition-colors",
          open ? "border-ring ring-2 ring-ring/30" : "border-input hover:border-foreground/30"
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        {value ? (
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="font-medium tabular-nums">{formatThaiDate(value)}</span>
            {describe && <span className="truncate text-xs text-muted-foreground">· {describe(value)}</span>}
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground/70">{placeholder}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกวันที่"
          className={cn("absolute left-0 z-50 w-[19rem] max-w-[calc(100vw-2rem)] animate-fade-in rounded-xl border border-border bg-card p-3 shadow-popover", openUp ? "bottom-full mb-2" : "top-full mt-2")}
        >
          {presets.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
              {presets.map((preset) => {
                const key = toDateKey(addDays(new Date(), preset.days));
                const selected = key === value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => pick(key)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}
          <Calendar key={value} from={value || undefined} to={value || undefined} min={min} onSelect={pick} />
        </div>
      )}
    </div>
  );
}

/** "ยืม N วัน" / "คืนวันนี้" style description for a due date. */
export function describeLoanLength(value: string) {
  const days = daysFromToday(value);
  if (days <= 0) return "คืนภายในวันนี้";
  if (days === 1) return "ยืม 1 วัน (คืนพรุ่งนี้)";
  return `ยืม ${days} วัน`;
}
