"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, RequiredMark } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker, describeLoanLength } from "@/components/ui/date-picker";
import { createLoanOnBehalfAction } from "@/actions/loan.action";
import { toDateKey } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

type Borrower = { id: string; name: string; employeeId: string | null; phone: string | null; department: string };
type LoanableEquipment = { id: string; name: string; code: string; category: string; available: number };
type Line = { equipmentId: string; quantity: number };

const PRESETS = [
  { label: "วันนี้", days: 0 },
  { label: "พรุ่งนี้", days: 1 },
  { label: "3 วัน", days: 3 },
  { label: "1 สัปดาห์", days: 7 },
];

export function AdminLoanForm({ users, equipment }: { users: Borrower[]; equipment: LoanableEquipment[] }) {
  const router = useRouter();
  const [userSearch, setUserSearch] = useState("");
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [lines, setLines] = useState<Line[]>([{ equipmentId: "", quantity: 1 }]);
  const [dueDate, setDueDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const matchingUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => `${u.name} ${u.employeeId ?? ""} ${u.department}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [userSearch, users]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, LoanableEquipment[]>();
    for (const item of equipment) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [equipment]);

  const equipmentById = new Map(equipment.map((e) => [e.id, e]));
  const chosen = lines.map((l) => l.equipmentId).filter(Boolean);
  const validLines = lines.filter((l) => l.equipmentId);
  const canSubmit = borrower && validLines.length > 0 && dueDate && purpose.trim().length > 0;

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  function submit() {
    if (!borrower) return;
    setError("");
    startTransition(async () => {
      const result = await createLoanOnBehalfAction({ userId: borrower.id, items: validLines, dueDate, purpose });
      if (!result.ok || !result.requestKey) {
        setError(result.message);
        return;
      }
      // Straight to approval with device selection for this request.
      router.push(`/admin/loans?tab=PENDING&approve=${result.requestKey}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              ผู้ยืม
              <RequiredMark />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {borrower ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{borrower.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {borrower.employeeId ?? "-"} · {borrower.department}
                      {borrower.phone && ` · ${borrower.phone}`}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setBorrower(null)}>
                  <X className="h-4 w-4" />
                  เปลี่ยน
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อ รหัสพนักงาน หรือแผนก"
                    aria-label="ค้นหาผู้ยืม"
                    className="pl-9"
                  />
                </div>
                {userSearch.trim() && (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {matchingUsers.length === 0 ? (
                      <li className="px-3 py-3 text-sm text-muted-foreground">ไม่พบผู้ใช้ (ต้องเป็นบัญชีที่อนุมัติแล้วและไม่ถูกระงับ)</li>
                    ) : (
                      matchingUsers.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setBorrower(u);
                              setUserSearch("");
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                          >
                            <span className="font-medium">{u.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.employeeId ?? "-"} · {u.department}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              อุปกรณ์
              <RequiredMark />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lines.map((line, index) => {
              const item = equipmentById.get(line.equipmentId);
              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {index === 0 && <Label htmlFor={`line-${index}`}>รุ่นอุปกรณ์</Label>}
                    <Select
                      id={`line-${index}`}
                      value={line.equipmentId}
                      onChange={(e) => updateLine(index, { equipmentId: e.target.value, quantity: 1 })}
                    >
                      <option value="">-- เลือกอุปกรณ์ --</option>
                      {byCategory.map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {items.map((e) => (
                            <option key={e.id} value={e.id} disabled={chosen.includes(e.id) && e.id !== line.equipmentId}>
                              {e.name} ({e.code}) · ว่าง {e.available}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </div>
                  <div className="flex w-24 flex-col gap-1.5">
                    {index === 0 && <Label htmlFor={`qty-${index}`}>จำนวน</Label>}
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min={1}
                      max={item?.available ?? 1}
                      value={line.quantity}
                      disabled={!item}
                      onChange={(e) => updateLine(index, { quantity: Math.min(item?.available ?? 1, Math.max(1, Number(e.target.value) || 1)) })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-rose-600"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="ลบรายการนี้"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="group w-fit gap-1.5"
              disabled={lines.length >= equipment.length}
              onClick={() => setLines((prev) => [...prev, { equipmentId: "", quantity: 1 }])}
            >
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              เพิ่มอุปกรณ์อีกรายการ
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>รายละเอียดการยืม</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due-date">
              กำหนดคืน
              <RequiredMark />
            </Label>
            <DatePicker
              id="due-date"
              name="dueDate"
              value={dueDate}
              onChange={setDueDate}
              min={toDateKey(new Date())}
              presets={PRESETS}
              describe={describeLoanLength}
              placeholder="เลือกวันคืน"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">
              วัตถุประสงค์
              <RequiredMark />
            </Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="เช่น ใช้ประชุมนอกสถานที่"
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="button" size="lg" className={cn("w-full gap-1.5")} disabled={!canSubmit || isPending} onClick={submit}>
            <Check className="h-4 w-4" />
            {isPending ? "กำลังสร้างคำขอ..." : "สร้างคำขอและเลือกเครื่อง"}
          </Button>
          <p className="text-xs text-muted-foreground">ขั้นต่อไปจะเปิดหน้าต่างอนุมัติให้เลือกเครื่องที่ส่งมอบ (และแจ้งเสียได้ถ้าเครื่องมีปัญหา)</p>
        </CardContent>
      </Card>
    </div>
  );
}
