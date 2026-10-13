import { z } from "zod";

export const updateProfileSchema = z.object({
  departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  phone: z
    .string()
    .trim()
    .max(20, "เบอร์ภายในยาวเกินไป")
    .regex(/^[0-9-]*$/, "กรุณากรอกเฉพาะตัวเลข")
    .optional()
    .or(z.literal("")),
});

export const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร")
  .refine((value) => /[a-z]/.test(value), "รหัสผ่านต้องมีอักษรภาษาอังกฤษตัวเล็กอย่างน้อย 1 ตัว")
  .refine((value) => /[A-Z]/.test(value), "รหัสผ่านต้องมีอักษรภาษาอังกฤษตัวใหญ่อย่างน้อย 1 ตัว")
  .refine((value) => /[^A-Za-z0-9\s]/.test(value), "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");

export const registerUserSchema = z.object({
  employeeId: z.string().trim().min(1, "กรุณากรอกรหัสพนักงาน").max(40).regex(/^[A-Za-z0-9-]+$/, "รหัสพนักงานใช้ได้เฉพาะตัวอักษร ตัวเลข และเครื่องหมาย -"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  phone: z.string().trim().max(20, "เบอร์ภายในยาวเกินไป").regex(/^[0-9-]*$/, "กรุณากรอกเฉพาะตัวเลข").optional().or(z.literal("")),
  password: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
