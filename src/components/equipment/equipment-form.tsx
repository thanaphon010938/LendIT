"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { createEquipmentAction, updateEquipmentAction } from "@/actions/equipment.action";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label, RequiredMark } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertCircle, Hash, Lock } from "lucide-react";
import { getCategoryColor, getEquipmentIcon } from "@/lib/equipment-icon";
import { cn } from "@/lib/utils";

export type EditableEquipment = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  status: "ACTIVE" | "RETIRED";
  hiddenFromUsers?: boolean | null;
  trackUnits?: boolean;
};

type CategoryOption = { id: string; name: string };

export function EquipmentForm({
  equipment,
  categories,
  defaultCategoryId,
  onSuccess,
}: {
  equipment?: EditableEquipment;
  categories: CategoryOption[];
  defaultCategoryId?: string;
  onSuccess?: () => void;
}) {
  const action = equipment ? updateEquipmentAction : createEquipmentAction;
  const [state, formAction] = useFormState(action, undefined);
  const [trackUnits, setTrackUnits] = useState(equipment?.trackUnits ?? true);
  // Existing tracked models change quantity by adding/retiring devices on the detail page.
  const quantityLocked = Boolean(equipment?.trackUnits);

  useEffect(() => {
    if (state?.ok) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {equipment && <input type="hidden" name="id" value={equipment.id} />}

      {equipment ? (
        // Code prefixes every asset tag and category groups history, so both are fixed after creation.
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-4">
            <LockedField label="รหัสอุปกรณ์" icon={<Hash className="h-4 w-4 text-muted-foreground" />}>
              <span className="font-mono">{equipment.code}</span>
            </LockedField>
            {(() => {
              const categoryName = categories.find((cat) => cat.id === equipment.categoryId)?.name ?? "-";
              const Icon = getEquipmentIcon(categoryName);
              return (
                <LockedField
                  label="ประเภทอุปกรณ์"
                  icon={
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", getCategoryColor(categoryName))}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  }
                >
                  {categoryName}
                </LockedField>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground">รหัสและประเภทกำหนดตอนเพิ่มอุปกรณ์ แก้ไขภายหลังไม่ได้</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">
              รหัสอุปกรณ์
              <RequiredMark />
            </Label>
            <Input id="code" name="code" placeholder="เช่น NB-001" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId">
              ประเภทอุปกรณ์
              <RequiredMark />
            </Label>
            <Select id="categoryId" name="categoryId" defaultValue={defaultCategoryId} required>
              <option value="">-- เลือกประเภท --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          ชื่ออุปกรณ์
          <RequiredMark />
        </Label>
        <Input id="name" name="name" defaultValue={equipment?.name} placeholder="เช่น MacBook Air M2" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">รายละเอียด</Label>
        <Textarea id="description" name="description" defaultValue={equipment?.description ?? ""} className="min-h-[72px]" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="imageUrl">ลิงก์รูปภาพ (ถ้ามี)</Label>
        <Input id="imageUrl" name="imageUrl" defaultValue={equipment?.imageUrl ?? ""} placeholder="https://..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity">
            {trackUnits && !equipment ? "จำนวนเครื่อง" : "จำนวนที่มีให้ยืม"}
            <RequiredMark />
          </Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={equipment?.quantity ?? 1}
            required
            readOnly={quantityLocked}
            className={quantityLocked ? "bg-muted text-muted-foreground" : undefined}
          />
          {quantityLocked && <p className="text-xs text-muted-foreground">เพิ่ม/ปลดระวางเครื่องได้ที่หน้ารายละเอียดอุปกรณ์</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">สถานะ</Label>
          <Select id="status" name="status" defaultValue={equipment?.status ?? "ACTIVE"}>
            <option value="ACTIVE">ใช้งานได้ปกติ</option>
            <option value="RETIRED">ปลดระวาง</option>
          </Select>
        </div>
      </div>

      {!equipment && (
        <label
          htmlFor="trackUnits"
          className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"
        >
          <input
            id="trackUnits"
            name="trackUnits"
            type="checkbox"
            checked={trackUnits}
            onChange={(event) => setTrackUnits(event.target.checked)}
            aria-label="เก็บข้อมูลรายเครื่อง"
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          />
          <span>
            <span className="font-medium">เก็บข้อมูลรายเครื่อง</span>
            <span className="block text-xs text-muted-foreground">
              {trackUnits
                ? "แต่ละเครื่องจะได้รหัสครุภัณฑ์ของตัวเอง (เช่น NB-001-01) ใส่ Serial ได้ภายหลัง เหมาะกับ Notebook, iPad, กล้อง"
                : "นับเป็นจำนวนอย่างเดียว เหมาะกับของสิ้นเปลือง เช่น สาย HDMI, adapter, เมาส์"}
            </span>
          </span>
        </label>
      )}

      <label
        htmlFor="hiddenFromUsers"
        className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground"
      >
        <input
          id="hiddenFromUsers"
          name="hiddenFromUsers"
          type="checkbox"
          defaultChecked={equipment?.hiddenFromUsers ?? false}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        ซ่อนทั้งรุ่นจากผู้ใช้ทั่วไป{equipment?.trackUnits && <span className="text-xs">(ถ้าจะกันไว้บางเครื่อง ให้ตั้งที่รายการเครื่อง)</span>}
      </label>

      {state && !state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SubmitButton pendingText="กำลังบันทึก..." className="w-full sm:w-fit sm:self-end">
        {equipment ? "บันทึกการแก้ไข" : "เพิ่มอุปกรณ์"}
      </SubmitButton>
    </form>
  );
}

/** Read-only field styled like the inputs around it (same look as the borrower fields on the loan form). */
function LockedField({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex h-10 items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted px-3" aria-readonly="true">
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{children}</span>
        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-label="แก้ไขไม่ได้" />
      </div>
    </div>
  );
}

/** Add equipment (no `equipment`) or edit it, in a modal over the current page. */
export function EquipmentDialog({
  equipment,
  categories,
  defaultCategoryId,
  trigger,
}: {
  equipment?: EditableEquipment;
  categories: CategoryOption[];
  defaultCategoryId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{equipment ? `แก้ไข ${equipment.name}` : "เพิ่มอุปกรณ์ใหม่"}</DialogTitle>
          <DialogDescription>
            {equipment ? "แก้ไขชื่อ รายละเอียด และสถานะของอุปกรณ์" : "กรอกรายละเอียดอุปกรณ์ที่ต้องการเพิ่มเข้าคลัง"}
          </DialogDescription>
        </DialogHeader>
        <EquipmentForm
          equipment={equipment}
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
