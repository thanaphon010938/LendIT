"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, formatThaiDate, fromDateKey, toDateKey } from "@/lib/thai-date";

const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/**
 * Month grid with Thai month/year (พ.ศ.). Highlights `from`..`to` (a single day when
 * they match); days before `min` are disabled.
 */
export function Calendar({
  from,
  to,
  min,
  onSelect,
  onHoverDay,
}: {
  from?: string;
  to?: string;
  min?: string;
  onSelect: (key: string) => void;
  onHoverDay?: (key: string | null) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const base = from ? fromDateKey(from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const todayKey = toDateKey(new Date());

  const days = useMemo(() => {
    const start = addDays(viewMonth, -viewMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [viewMonth]);

  const minMonth = min ? new Date(fromDateKey(min).getFullYear(), fromDateKey(min).getMonth(), 1) : null;
  const canGoBack = !minMonth || viewMonth > minMonth;
  const isRange = Boolean(from && to && to !== from);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          disabled={!canGoBack}
          aria-label="เดือนก่อนหน้า"
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{viewMonth.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</p>
        <button
          type="button"
          onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="เดือนถัดไป"
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {weekdays.map((day) => (
          <span key={day} className="py-1.5">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7" onMouseLeave={() => onHoverDay?.(null)}>
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const disabled = Boolean(min && key < min);
          const isStart = key === from;
          const isEnd = key === to;
          const selected = isStart || isEnd;
          const inRange = Boolean(isRange && from && to && key > from && key < to);
          return (
            <div
              key={key}
              className={cn(
                "py-0.5",
                inRange && "bg-primary/10",
                isRange && isStart && "bg-gradient-to-r from-transparent from-50% to-primary/10 to-50%",
                isRange && isEnd && "bg-gradient-to-l from-transparent from-50% to-primary/10 to-50%"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(key)}
                onMouseEnter={() => onHoverDay?.(key)}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={formatThaiDate(key)}
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                  !inMonth && "text-muted-foreground/40",
                  disabled && "cursor-not-allowed text-muted-foreground/30 line-through decoration-muted-foreground/30",
                  selected ? "bg-primary font-semibold text-primary-foreground shadow-sm" : !disabled && "hover:bg-muted",
                  key === todayKey && !selected && "font-semibold text-primary ring-1 ring-inset ring-primary/40"
                )}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
