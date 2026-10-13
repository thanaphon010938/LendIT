import type { ReturnCondition } from "@prisma/client";

export const RETURN_CONDITIONS: { value: ReturnCondition; label: string; hint: string; className: string }[] = [
  { value: "NORMAL", label: "ปกติ", hint: "", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "DAMAGED", label: "ชำรุด", hint: "ยังใช้งานได้ บันทึกไว้เป็นหลักฐาน", className: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "BROKEN", label: "เสีย", hint: "ใช้งานไม่ได้ จะถูกพักไว้ในรายการรอซ่อม ไม่ให้ยืมจนกว่าจะซ่อมเสร็จ", className: "border-rose-300 bg-rose-50 text-rose-700" },
  { value: "LOST", label: "สูญหาย", hint: "ไม่ได้รับของคืน จะถูกพักไว้ในรายการรอซ่อม/ตรวจสอบ", className: "border-slate-400 bg-slate-100 text-slate-700" },
];

export const returnConditionLabel = (condition: ReturnCondition) =>
  RETURN_CONDITIONS.find((c) => c.value === condition)?.label ?? condition;

export const returnConditionBadgeClass: Record<ReturnCondition, string> = {
  NORMAL: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DAMAGED: "bg-amber-50 text-amber-700 ring-amber-200",
  BROKEN: "bg-rose-50 text-rose-700 ring-rose-200",
  LOST: "bg-slate-100 text-slate-700 ring-slate-300",
};
