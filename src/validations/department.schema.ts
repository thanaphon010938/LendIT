import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "กรุณากรอกรหัสแผนก")
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/, "ใช้ตัวอักษร A-Z, ตัวเลข และ _ เท่านั้น"),
  name: z.string().trim().min(2, "กรุณากรอกชื่อแผนก").max(100),
});

export const updateDepartmentSchema = createDepartmentSchema.extend({
  id: z.string().min(1, "ไม่พบไอดีแผนก"),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
