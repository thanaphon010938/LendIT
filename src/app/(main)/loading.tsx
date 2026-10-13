import { LoaderCircle } from "lucide-react";

export default function MainLoading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/75 backdrop-blur-[2px] dark:bg-background/75"
      role="status"
      aria-live="polite"
      aria-label="กำลังโหลดหน้า"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 text-foreground shadow-popover">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">กำลังโหลดหน้า...</span>
      </div>
    </div>
  );
}
