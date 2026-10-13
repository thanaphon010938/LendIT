import { Moon, Sparkles, Sun, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "morning" | "afternoon" | "evening" | "night";

const TIME_ZONE = "Asia/Bangkok";

function currentPeriod(): Period {
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "evening";
  return "night";
}

const periods: Record<Period, { greeting: string; glow: string }> = {
  morning: { greeting: "อรุณสวัสดิ์", glow: "bg-amber-300/50" },
  afternoon: { greeting: "สวัสดีตอนบ่าย", glow: "bg-yellow-200/50" },
  evening: { greeting: "สวัสดีตอนเย็น", glow: "bg-orange-300/50" },
  night: { greeting: "สวัสดีตอนค่ำ", glow: "bg-sky-200/40" },
};

/** Animated time-of-day icon in a glass badge. */
export function TimeOfDayIcon({ className }: { className?: string }) {
  const period = currentPeriod();
  return (
    <span
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-md",
        className
      )}
      aria-hidden="true"
    >
      <span className={cn("absolute inset-2 rounded-full blur-lg motion-safe:animate-glow-pulse", periods[period].glow)} />
      {period === "morning" && <Sun className="relative h-7 w-7 text-amber-200 motion-safe:animate-[spin_14s_linear_infinite]" />}
      {period === "afternoon" && <Sun className="relative h-7 w-7 text-yellow-100 motion-safe:animate-[spin_20s_linear_infinite]" />}
      {period === "evening" && <Sunset className="relative h-7 w-7 text-orange-200 motion-safe:animate-float" />}
      {period === "night" && (
        <>
          <Moon className="relative h-7 w-7 -rotate-12 text-sky-100 motion-safe:animate-float" />
          <Sparkles className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white motion-safe:animate-twinkle" />
          <Sparkles
            className="absolute bottom-2 left-1.5 h-2.5 w-2.5 text-white/80 motion-safe:animate-twinkle"
            style={{ animationDelay: "-1.2s" }}
          />
        </>
      )}
    </span>
  );
}

export function timeGreeting() {
  return periods[currentPeriod()].greeting;
}
