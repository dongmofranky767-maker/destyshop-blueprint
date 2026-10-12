import { z } from "zod";

export const shopInputSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Z0-9-]+$/, "Majuscules, chiffres et tirets uniquement"),
  name: z.string().trim().min(2).max(120),
  city_id: z.string().uuid().nullable().optional(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
});
export type ShopInput = z.infer<typeof shopInputSchema>;
