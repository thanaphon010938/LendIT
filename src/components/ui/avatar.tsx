import { cn } from "@/lib/utils";

const segmenter = typeof Intl !== "undefined" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function firstGrapheme(text: string) {
  if (!text) return "";
  if (segmenter) return Array.from(segmenter.segment(text))[0]?.segment ?? "";
  return Array.from(text)[0] ?? "";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return firstGrapheme(parts[0] ?? "").toUpperCase();
}

const palette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  }[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClass,
        colorFor(name || "?"),
        className
      )}
    >
      {initials(name || "?")}
    </div>
  );
}
