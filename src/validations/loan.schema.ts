import { z } from "zod";

export const loanStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "RETURNED"]);

export const createLoanSchema = z
  .object({
    equipmentId: z.string().min(1, "กรุณาเลือกอุปกรณ์").optional(),
    equipmentIds: z
      .array(z.string().min(1))
      .max(200, "เลือกอุปกรณ์ได้ไม่เกิน 200 รายการต่อคำขอ")
      .refine((ids) => new Set(ids).size === ids.length, "พบอุปกรณ์ซ้ำในคำขอ")
      .optional()
      .default([]),
    dueDate: z.coerce.date({ message: "กรุณาระบุวันที่กำหนดคืน" }),
    quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
    purpose: z.string().trim().min(1, "กรุณากรอกวัตถุประสงค์ที่ยืม").max(500),
  })
  .refine((data) => Boolean(data.equipmentId) || data.equipmentIds.length > 0, {
    message: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ",
    path: ["equipmentId"],
  })
  .transform((data) => ({
    ...data,
    equipmentIds: data.equipmentIds.length > 0 ? data.equipmentIds : data.equipmentId ? [data.equipmentId] : [],
    equipmentId: data.equipmentId ?? data.equipmentIds[0] ?? "",
  }));

export const updateLoanStatusSchema = z.object({
  id: z.string().min(1),
  status: loanStatusEnum,
});

export const returnLoanSchema = z.object({
  id: z.string().min(1),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanStatusInput = z.infer<typeof updateLoanStatusSchema>;
