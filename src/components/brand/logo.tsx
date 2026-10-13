import { cn } from "@/lib/utils";

/**
 * LendIT mark: a rounded "L" (lend) holding a small square (the device being lent),
 * on an indigo→violet tile. `variant="light"` is for dark/colored backgrounds.
 */
export function LogoMark({
  size = 36,
  variant = "brand",
  className,
}: {
  size?: number;
  variant?: "brand" | "light";
  className?: string;
}) {
  const light = variant === "light";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[30%]",
        light
          ? "bg-white shadow-lg shadow-indigo-950/20"
          : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* soft top highlight for depth */}
      <span className={cn("absolute inset-x-0 top-0 h-1/2", light ? "bg-gradient-to-b from-indigo-50 to-transparent" : "bg-gradient-to-b from-white/20 to-transparent")} />
      <svg viewBox="0 0 24 24" className="relative" style={{ width: size * 0.7, height: size * 0.7 }} fill="none">
        <path
          d="M7 5.5v10a2.5 2.5 0 0 0 2.5 2.5H18"
          stroke={light ? "url(#lendit-stroke)" : "white"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="12" y="6" width="6.5" height="6.5" rx="1.8" className={light ? "fill-amber-400" : "fill-amber-300"} />
        {light && (
          <defs>
            <linearGradient id="lendit-stroke" x1="7" y1="5" x2="18" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        )}
      </svg>
    </span>
  );
}

/** Mark + "LendIT" wordmark, optionally with a tagline. */
export function Logo({
  size = 36,
  variant = "brand",
  tagline,
  className,
}: {
  size?: number;
  variant?: "brand" | "light";
  tagline?: string;
  className?: string;
}) {
  const light = variant === "light";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} variant={variant} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[1.15rem] font-extrabold tracking-tight", light ? "text-white" : "text-foreground")}>
          Lend
          <span className={light ? "text-amber-200" : "bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"}>IT</span>
        </span>
        {tagline && (
          <span className={cn("mt-1 text-xs font-medium", light ? "text-indigo-100" : "text-muted-foreground")}>{tagline}</span>
        )}
      </span>
    </span>
  );
}
