"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useFormState } from "react-dom";
import { requestLoanAction } from "@/actions/loan.action";
import { Label, RequiredMark } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker, describeLoanLength } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/lib/thai-date";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  Check,
  ClipboardPen,
  Laptop,
  Lock,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import type { Department } from "@prisma/client";
import type { EquipmentWithAvailability } from "@/services/equipment.service";

const dueDatePresets = [
  { label: "พรุ่งนี้", days: 1 },
  { label: "3 วัน", days: 3 },
  { label: "1 สัปดาห์", days: 7 },
  { label: "2 สัปดาห์", days: 14 },
  { label: "1 เดือน", days: 30 },
];

/** Consistent section heading; `step` matches the numbered steps in the page banner. */
function SectionHeader({
  id,
  icon: Icon,
  title,
  description,
  step,
  done = false,
  required = false,
  aside,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  step?: number;
  done?: boolean;
  required?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-inset ring-indigo-200/70">
          <Icon className="h-[18px] w-[18px]" />
          {step && (
            <span
              className={cn(
                "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-card transition-colors",
                done ? "bg-emerald-500" : "bg-indigo-600"
              )}
              aria-label={done ? `ขั้นที่ ${step} เรียบร้อย` : `ขั้นที่ ${step}`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : step}
            </span>
          )}
        </span>
        <div className="pt-0.5">
          <h2 id={id} className="font-semibold">
            {title}
            {required && <RequiredMark />}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {aside}
    </div>
  );
}
export function LoanForm({
  equipmentList,
  preselectedId,
  requesterDepartment,
  borrowerName,
  requesterPhone,
}: {
  equipmentList: EquipmentWithAvailability[];
  preselectedId?: string;
  requesterDepartment: Department;
  borrowerName?: string;
  requesterPhone?: string | null;
}) {
  const [state, formAction] = useFormState(requestLoanAction, undefined);
  // No default: the borrower must pick a return date themselves.
  const [purpose, setPurpose] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>(() => {
    if (!preselectedId) return {};
    return { [preselectedId]: 1 };
  });

  const groupedEquipment = useMemo(() => {
    return equipmentList.reduce<Record<string, EquipmentWithAvailability[]>>((acc, equipment) => {
      const key = equipment.category.name;
      acc[key] = acc[key] ? [...acc[key], equipment] : [equipment];
      return acc;
    }, {});
  }, [equipmentList]);

  const orderedCategories = useMemo(
    () => Object.keys(groupedEquipment).sort((a, b) => a.localeCompare(b)),
    [groupedEquipment]
  );

  const selectedItems = useMemo(
    () =>
      equipmentList
        .filter((equipment) => (selectedQuantities[equipment.id] ?? 0) > 0)
        .map((equipment) => ({
          equipmentId: equipment.id,
          quantity: selectedQuantities[equipment.id] ?? 0,
        })),
    [equipmentList, selectedQuantities]
  );
  const selectedQuantityTotal = selectedItems.reduce((total, item) => total + item.quantity, 0);
  const updateQuantity = (equipmentId: string, nextQuantity: number) => {
    const equipment = equipmentList.find((item) => item.id === equipmentId);
    if (!equipment) return;

    const maxQty = equipment.availableQuantity;
    const safeQty = Math.min(Math.max(nextQuantity, 0), maxQty);

    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (safeQty <= 0) {
        delete next[equipmentId];
        return next;
      }
      next[equipmentId] = safeQty;
      return next;
    });
  };

  const toggle = (equipmentId: string) => {
    updateQuantity(equipmentId, (selectedQuantities[equipmentId] ?? 0) > 0 ? 0 : 1);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, equipmentId: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle(equipmentId);
    }
  };

  const categoryEquipment = activeCategory === "all" ? equipmentList : groupedEquipment[activeCategory] ?? [];
  const searchTerm = search.trim().toLowerCase();
  const visibleEquipment = searchTerm
    ? categoryEquipment.filter(
        (item) => item.name.toLowerCase().includes(searchTerm) || item.code.toLowerCase().includes(searchTerm)
      )
    : categoryEquipment;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">
        ช่องที่มีเครื่องหมาย <span className="font-semibold text-rose-600">*</span> จำเป็นต้องกรอก
      </p>

      <section className="flex flex-col gap-4" aria-labelledby="borrower-details-heading">
        <SectionHeader
          id="borrower-details-heading"
          icon={UserRound}
          title="ข้อมูลผู้ยืม"
          description="ดึงจากบัญชีของคุณอัตโนมัติ แก้ได้เฉพาะเบอร์ภายใน เพื่อให้ผู้ดูแลติดต่อกลับได้"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">ชื่อผู้ยืม</p>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted px-3" aria-readonly="true">
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">{borrowerName || "-"}</p>
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-label="แก้ไขไม่ได้" />
            </div>
            <input type="hidden" name="borrowerName" value={borrowerName ?? ""} />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">แผนก</p>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted px-3" aria-readonly="true">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">{requesterDepartment.name}</p>
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-label="แก้ไขไม่ได้" />
            </div>
            <input type="hidden" name="requesterDepartment" value={requesterDepartment.name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requesterPhone" className="text-xs">
              เบอร์ภายใน <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="requesterPhone"
                name="requesterPhone"
                defaultValue={requesterPhone ?? ""}
                placeholder="เช่น 1234"
                className="h-10 pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6" aria-labelledby="equipment-selection-heading">
        <SectionHeader
          id="equipment-selection-heading"
          icon={Laptop}
          step={1}
          done={selectedItems.length > 0}
          required
          title="เลือกอุปกรณ์ที่ต้องการยืม"
          description="แตะรายการที่ต้องการยืม (เลือกได้หลายชิ้น)"
          aside={
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedItems.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
              aria-live="polite"
            >
              เลือกแล้ว {selectedItems.length} รายการ · {selectedQuantityTotal} ชิ้น
            </span>
          }
        />

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
            placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์"
            aria-label="ค้นหาอุปกรณ์"
            className="h-10 pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="กรองตามประเภท">
          {["all", ...orderedCategories].map((categoryName) => {
            const active = activeCategory === categoryName;
            const count = categoryName === "all" ? equipmentList.length : groupedEquipment[categoryName]?.length ?? 0;
            return (
              <button
                key={categoryName}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(categoryName)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  active ? "border-foreground bg-foreground font-medium text-background" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {categoryName === "all" ? "ทั้งหมด" : categoryName}
                <span className={cn("ml-1.5 text-xs", active ? "text-background/70" : "text-muted-foreground/70")}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Equipment list: tap a row to select it. Capped at ~6 rows, scrolls beyond that. */}
        <div className="scrollbar-thin max-h-[420px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {visibleEquipment.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่พบอุปกรณ์ที่ตรงกับ “{search.trim()}”</p>
          )}
          {visibleEquipment.map((item) => {
            const quantity = selectedQuantities[item.id] ?? 0;
            const selected = quantity > 0;
            const Icon = getEquipmentIcon(item.category.name);
            return (
              <div
                key={item.id}
                role="checkbox"
                aria-checked={selected}
                tabIndex={0}
                onClick={() => toggle(item.id)}
                onKeyDown={(event) => onRowKeyDown(event, item.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4",
                  selected ? "bg-primary/[0.06]" : "hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-primary bg-primary text-white" : "border-muted-foreground/30 bg-card"
                  )}
                  aria-hidden="true"
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", getCategoryColor(item.category.name))}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("line-clamp-2 text-sm sm:truncate", selected ? "font-semibold" : "font-medium")}>{item.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                    item.availableQuantity > 1
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", item.availableQuantity > 1 ? "bg-emerald-500" : "bg-amber-500")} />
                  {item.availableQuantity > 1 ? `ว่าง ${item.availableQuantity} ชิ้น` : "เหลือ 1 ชิ้น"}
                </span>
              </div>
            );
          })}
        </div>
        {/* Basket */}
        {selectedItems.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-indigo-50/80 to-violet-50/60">
            <div className="flex items-center justify-between border-b border-primary/10 px-4 py-2.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                <ShoppingBag className="h-4 w-4 text-primary" />
                รายการที่จะยืม
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{selectedQuantityTotal} ชิ้น</span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedQuantities({})}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-rose-600"
              >
                ล้างทั้งหมด
              </button>
            </div>
            <ul className="divide-y divide-primary/10">
              {selectedItems.map((selection) => {
                const equipment = equipmentList.find((entry) => entry.id === selection.equipmentId);
                if (!equipment) return null;
                const Icon = getEquipmentIcon(equipment.category.name);
                return (
                  <li key={selection.equipmentId} className="flex items-center gap-3 px-4 py-2.5 animate-fade-in">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", getCategoryColor(equipment.category.name))}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{equipment.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{equipment.code}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-card p-0.5 ring-1 ring-inset ring-border">
                      <button
                        type="button"
                        aria-label={`ลดจำนวน ${equipment.name}`}
                        onClick={() => updateQuantity(equipment.id, selection.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{selection.quantity}</span>
                      <button
                        type="button"
                        aria-label={`เพิ่มจำนวน ${equipment.name}`}
                        onClick={() => updateQuantity(equipment.id, selection.quantity + 1)}
                        disabled={selection.quantity >= equipment.availableQuantity}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`นำ ${equipment.name} ออก`}
                      onClick={() => updateQuantity(equipment.id, 0)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4 shrink-0" />
            ยังไม่ได้เลือกอุปกรณ์ — เลือกอย่างน้อย 1 ชิ้นจึงจะส่งคำขอได้
          </div>
        )}

        <input type="hidden" name="selectedItems" value={JSON.stringify(selectedItems)} />
      </section>

      <div className="grid gap-6 border-t border-border pt-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="flex flex-col gap-4" aria-labelledby="purpose-heading">
          <SectionHeader
            id="purpose-heading"
            icon={ClipboardPen}
            step={2}
            done={purpose.trim().length > 0}
            required
            title="วัตถุประสงค์การยืม"
            description="บอกสั้น ๆ ว่าจะนำไปใช้ทำอะไร ช่วยให้ผู้ดูแลพิจารณาอนุมัติได้เร็วขึ้น"
          />
          <div className="flex flex-col gap-1.5">
            <Textarea
              id="purpose"
              name="purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              maxLength={500}
              aria-labelledby="purpose-heading"
              placeholder="เช่น ใช้นำเสนองานในการประชุมฝ่ายขาย ห้องประชุม 3"
              required
            />
            <p className="self-end text-xs tabular-nums text-muted-foreground">{purpose.length}/500</p>
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="due-date-heading">
          <SectionHeader
            id="due-date-heading"
            icon={CalendarCheck}
            step={3}
            done={Boolean(dueDate)}
            required
            title="กำหนดวันคืน"
            description="เลือกวันคืนจากปฏิทิน หรือเลือกระยะเวลายืม"
          />
          <div>
            <DatePicker
              id="dueDate"
              name="dueDate"
              value={dueDate}
              onChange={setDueDate}
              min={toDateKey(new Date())}
              presets={dueDatePresets}
              describe={describeLoanLength}
              placeholder="เลือกวันคืน"
            />
          </div>
        </section>
      </div>

      {state && !state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SubmitButton
          pendingText="กำลังส่งคำขอ..."
          size="lg"
          className="w-full sm:w-auto"
          disabled={selectedItems.length === 0 || !dueDate}
        >
          ส่งคำขอยืม
        </SubmitButton>
      </div>
    </form>
  );
}
