"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/components/theme/theme-script";

export type ThemeChoice = "light" | "dark" | "system";

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "system" ? stored : "light";
  } catch {
    return "light";
  }
}

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const OPTIONS: { value: ThemeChoice; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "light", label: "สว่าง", hint: "ธีมสว่าง", icon: Sun },
  { value: "dark", label: "มืด", hint: "ธีมมืด", icon: Moon },
  { value: "system", label: "ระบบ", hint: "ตามการตั้งค่าของเครื่อง", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  // null until mounted: the server can't know the stored choice.
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => setChoice(readChoice()), []);

  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  function choose(next: ThemeChoice) {
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice still applies for this page.
    }
    apply(next);
  }

  if (compact) {
    const index = OPTIONS.findIndex((option) => option.value === (choice ?? "light"));
    const current = OPTIONS[index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    return (
      <button
        type="button"
        onClick={() => choose(next.value)}
        title={`ธีม: ${current.label} (กดเพื่อเปลี่ยนเป็น${next.label})`}
        aria-label={`ธีม: ${current.label} กดเพื่อเปลี่ยนเป็น${next.label}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <current.icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="ธีม" className="flex rounded-lg bg-muted p-0.5">
      {OPTIONS.map((option) => {
        const selected = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.hint}
            onClick={() => choose(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              selected && "bg-card text-foreground shadow-soft"
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
