import { z } from "zod";

export const equipmentStatusEnum = z.enum(["ACTIVE", "RETIRED"]);

export const createEquipmentSchema = z.object({
  code: z.string().trim().min(2, "กรุณากรอกรหัสอุปกรณ์").max(50),
  name: z.string().trim().min(2, "กรุณากรอกชื่ออุปกรณ์").max(150),
  categoryId: z.string().min(1, "กรุณาเลือกประเภทอุปกรณ์"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("URL ไม่ถูกต้อง").optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  status: equipmentStatusEnum.default("ACTIVE"),
  hiddenFromUsers: z.coerce.boolean().default(false),
  trackUnits: z.coerce.boolean().default(true),
});

// Code and category can't change after creation (see equipmentService.updateEquipment).
export const updateEquipmentSchema = createEquipmentSchema.omit({ code: true, categoryId: true, trackUnits: true }).partial().extend({
  id: z.string().min(1),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
