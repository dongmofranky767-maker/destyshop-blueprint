import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, fromDbError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const uuid = z.string().uuid();

/** Création de commande : tout est revérifié et réservé par la fonction SQL transactionnelle place_order. */
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    shopId: uuid,
    fulfillment: z.enum(["pickup", "shipping", "home_delivery"]),
    addressId: uuid.nullable().optional(),
    items: z.array(z.object({ variantId: uuid, quantity: z.number().int().min(1).max(99) })).min(1).max(50),
    requestId: z.string().min(8).max(64),
    note: z.string().trim().max(500).optional(),
  }).refine((d) => d.fulfillment === "pickup" || !!d.addressId, { message: "Adresse requise pour ce mode de réception." }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc("place_order", {
      _shop_id: data.shopId,
      _fulfillment: data.fulfillment,
      _address_id: (data.fulfillment === "pickup" ? null : data.addressId) as unknown as string,
      _items: data.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      _request_id: data.requestId,
      _note: data.note || undefined,
    });
    if (error) {
      logger.warn("orders.place", "commande refusée", { userId: context.userId, code: error.code, msg: error.message });
      throw fromDbError(error);
    }
    logger.info("orders.place", "commande créée", { userId: context.userId, orderId });
    return { orderId: orderId as string };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("orders")
      .select("id, reference, status, fulfillment, total_xaf, created_at, shops(name), order_items(quantity)")
      .eq("customer_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw fromDbError(error);
    return (data ?? []).map((o) => ({
      id: o.id, reference: o.reference, status: o.status, fulfillment: o.fulfillment, total: o.total_xaf,
      createdAt: o.created_at, shopName: o.shops?.name ?? null,
      itemCount: o.order_items.reduce((a, i) => a + i.quantity, 0),
    }));
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: o, error } = await context.supabase.from("orders")
      .select(`id, reference, status, fulfillment, total_xaf, created_at, updated_at, customer_note,
        shops(id, name, address, phone),
        addresses(label, line1, cities(name)),
        order_items(id, quantity, unit_price_xaf, product_variants(id, label, products(name, slug, product_images(url, position)))),
        order_status_history(status, note, created_at),
        deliveries(mode, carrier, tracking_ref, status, updated_at)`)
      .eq("id", data.id).eq("customer_id", context.userId).maybeSingle();
    if (error) throw fromDbError(error);
    if (!o) throw notFound();
    const d = Array.isArray(o.deliveries) ? o.deliveries[0] : o.deliveries;
    return {
      id: o.id, reference: o.reference, status: o.status, fulfillment: o.fulfillment, total: o.total_xaf,
      createdAt: o.created_at, note: o.customer_note,
      shop: o.shops, address: o.addresses ? { label: o.addresses.label, line1: o.addresses.line1, city: o.addresses.cities?.name ?? null } : null,
      items: o.order_items.map((i) => ({
        id: i.id, quantity: i.quantity, unitPrice: i.unit_price_xaf, label: i.product_variants?.label ?? null,
        variantId: i.product_variants?.id ?? null,
        name: i.product_variants?.products?.name ?? "Article", slug: i.product_variants?.products?.slug ?? null,
        image: i.product_variants?.products?.product_images.sort((a, b) => a.position - b.position)[0]?.url ?? null,
      })),
      history: [...o.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      delivery: d ? { mode: d.mode, carrier: d.carrier, trackingRef: d.tracking_ref, status: d.status, updatedAt: d.updated_at } : null,
    };
  });

export const cancelMyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_my_order", { _order_id: data.id });
    if (error) throw fromDbError(error);
    logger.info("orders.cancel", "commande annulée par le client", { userId: context.userId, orderId: data.id });
    return { ok: true };
  });

/** Catégories déjà achetées par le client (critère « préférences/historique » des suggestions). */
export const getMyPreferredCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("orders")
      .select("status, order_items(product_variants(products(category_id)))")
      .eq("customer_id", context.userId).neq("status", "cancelled").limit(50);
    if (error) throw fromDbError(error);
    const ids = new Set<string>();
    for (const o of data ?? []) for (const i of o.order_items) {
      const c = i.product_variants?.products?.category_id;
      if (c) ids.add(c);
    }
    return [...ids];
  });

// ---------- Adresses ----------
export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("addresses")
      .select("id, label, line1, city_id, cities(name)").eq("user_id", context.userId).order("created_at");
    if (error) throw fromDbError(error);
    return (data ?? []).map((a) => ({ id: a.id, label: a.label, line1: a.line1, cityId: a.city_id, city: a.cities?.name ?? null }));
  });

export const addAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    label: z.string().trim().max(60).optional(),
    line1: z.string().trim().min(5, "Adresse trop courte").max(200),
    cityId: uuid,
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const location = data.lat !== undefined && data.lng !== undefined ? `SRID=4326;POINT(${data.lng} ${data.lat})` : null;
    const { data: a, error } = await context.supabase.from("addresses")
      .insert({ user_id: context.userId, label: data.label || null, line1: data.line1, city_id: data.cityId, location: location as unknown as never })
      .select("id").single();
    if (error) throw fromDbError(error);
    return a;
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("addresses").delete({ count: "exact" }).eq("id", data.id).eq("user_id", context.userId);
    if (error) {
      if (error.code === "23503") throw new AppError("CONFLICT", "Cette adresse est utilisée par une commande et ne peut pas être supprimée.");
      throw fromDbError(error);
    }
    if (!count) throw new AppError("NOT_FOUND");
    return { ok: true };
  });
