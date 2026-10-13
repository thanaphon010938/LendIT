"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IssueStatus, ReturnCondition } from "@prisma/client";
import { AlertCircle, Archive, CheckCircle2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { resolveIssueAction } from "@/actions/equipment-issue.action";
import { returnConditionBadgeClass, returnConditionLabel } from "@/lib/return-condition";
import { getCategoryColor, getEquipmentIcon } from "@/lib/equipment-icon";
import { cn, formatDate } from "@/lib/utils";

type Issue = {
  id: string;
  condition: ReturnCondition;
  quantity: number;
  note: string;
  status: IssueStatus;
  reportedByName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  equipment: { id: string; code: string; name: string; quantity: number; category: { name: string } };
  unit: { id: string; assetTag: string; serialNumber: string | null } | null;
};

const tabs: { id: IssueStatus | "ALL"; label: string }[] = [
  { id: "OPEN", label: "รอดำเนินการ" },
  { id: "REPAIRED", label: "ซ่อมเสร็จ" },
  { id: "WRITTEN_OFF", label: "ตัดจำหน่าย" },
  { id: "ALL", label: "ทั้งหมด" },
];

const resolutionCopy = {
  REPAIRED: {
    label: "ซ่อมเสร็จ",
    icon: CheckCircle2,
    title: "บันทึกซ่อมเสร็จ",
    description: (n: number) => `${n} ชิ้นจะกลับมาให้ยืมได้ตามปกติ`,
    confirm: "ยืนยันซ่อมเสร็จ",
    variant: "success" as const,
    placeholder: "เช่น เปลี่ยนจอใหม่แล้ว (ไม่บังคับ)",
  },
  WRITTEN_OFF: {
    label: "ตัดจำหน่าย",
    icon: Archive,
    title: "ตัดจำหน่ายอุปกรณ์",
    description: (n: number) => `จำนวนอุปกรณ์ทั้งหมดของรุ่นนี้จะลดลง ${n} ชิ้น ย้อนกลับไม่ได้`,
    confirm: "ยืนยันตัดจำหน่าย",
    variant: "destructive" as const,
    placeholder: "เช่น ซ่อมไม่คุ้ม, หาไม่พบ (ไม่บังคับ)",
  },
};

function ResolveButton({ issue, resolution }: { issue: Issue; resolution: keyof typeof resolutionCopy }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const copy = resolutionCopy[resolution];
  const Icon = copy.icon;

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await resolveIssueAction(issue.id, resolution, note);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant={resolution === "REPAIRED" ? "success" : "outline"} className="gap-1.5">
          <Icon className="h-4 w-4" />
          {copy.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {issue.equipment.name} ({issue.unit?.assetTag ?? issue.equipment.code}) · {copy.description(issue.quantity)}
          </DialogDescription>
        </DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={copy.placeholder} maxLength={500} />
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
          </DialogClose>
          <Button type="button" variant={copy.variant} onClick={handleConfirm} disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IssuesManager({ issues }: { issues: Issue[] }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("OPEN");
  const visible = activeTab === "ALL" ? issues : issues.filter((issue) => issue.status === activeTab);
  const countFor = (id: (typeof tabs)[number]["id"]) => (id === "ALL" ? issues.length : issues.filter((i) => i.status === id).length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
              <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-muted")}>{countFor(tab.id)}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={activeTab === "OPEN" ? "ไม่มีอุปกรณ์รอซ่อม" : "ไม่มีรายการในสถานะนี้"}
          description={activeTab === "OPEN" ? "เมื่อบันทึกคืนอุปกรณ์ว่าเสียหรือสูญหาย จะแสดงที่นี่" : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((issue) => {
            const Icon = getEquipmentIcon(issue.equipment.category.name);
            return (
              <Card key={issue.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", getCategoryColor(issue.equipment.category.name))}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{issue.equipment.name}</p>
                      {issue.unit ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                          {issue.unit.assetTag}
                          {issue.unit.serialNumber && <span className="font-normal text-muted-foreground"> · S/N {issue.unit.serialNumber}</span>}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{issue.equipment.code}</span>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", returnConditionBadgeClass[issue.condition])}>
                        {returnConditionLabel(issue.condition)}
                        {!issue.unit && ` ${issue.quantity} ชิ้น`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{issue.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      แจ้งโดย {issue.reportedByName ?? "ผู้ดูแลระบบ"} · {formatDate(issue.createdAt)}
                    </p>
                    {issue.status !== "OPEN" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {issue.status === "REPAIRED" ? "ซ่อมเสร็จ" : "ตัดจำหน่าย"}โดย {issue.resolvedByName ?? "ผู้ดูแลระบบ"}
                        {issue.resolvedAt && ` · ${formatDate(issue.resolvedAt)}`}
                        {issue.resolutionNote && ` · ${issue.resolutionNote}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {issue.status === "OPEN" ? (
                    <>
                      <ResolveButton issue={issue} resolution="WRITTEN_OFF" />
                      <ResolveButton issue={issue} resolution="REPAIRED" />
                    </>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                        issue.status === "REPAIRED" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"
                      )}
                    >
                      {issue.status === "REPAIRED" ? "ซ่อมเสร็จ" : "ตัดจำหน่ายแล้ว"}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
