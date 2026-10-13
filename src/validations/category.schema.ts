import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "กรุณากรอกชื่อประเภทอุปกรณ์").max(50),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
