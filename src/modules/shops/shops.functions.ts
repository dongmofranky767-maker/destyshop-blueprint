import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, fromDbError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { shopInputSchema } from "./schemas";

/** Boutiques visibles par l'utilisateur (RLS : actives + sa boutique + toutes pour super-admin/IT). */
export const listShops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shops")
      .select("id, code, name, address, phone, status, cities(name)")
      .order("name");
    if (error) throw fromDbError(error);
    return data ?? [];
  });

/** Création d'une boutique — réservé au Super-Administrateur réseau (vérifié aussi par RLS). */
export const createShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => shopInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isNetwork } = await context.supabase.rpc("is_network_admin", { _user_id: context.userId });
    if (!isNetwork) throw new AppError("FORBIDDEN");
    const location =
      data.latitude !== undefined && data.longitude !== undefined ? `SRID=4326;POINT(${data.longitude} ${data.latitude})` : null;
    const { data: shop, error } = await context.supabase
      .from("shops")
      .insert({
        code: data.code, name: data.name, city_id: data.city_id ?? null, address: data.address ?? null,
        phone: data.phone ?? null, status: data.status, location: location as unknown as never,
      })
      .select("id")
      .single();
    if (error) throw fromDbError(error);
    logger.info("shops.create", "boutique créée", { shopId: shop.id, by: context.userId });
    return shop;
  });

export const updateShopStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["draft", "active", "closed"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("shops").update({ status: data.status }, { count: "exact" }).eq("id", data.id);
    if (error) throw fromDbError(error);
    if (!count) throw new AppError("FORBIDDEN");
    return { ok: true };
  });
