import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { fromDbError } from "@/lib/errors";

const db = async () => (await import("@/lib/supabase-public.server")).createPublicClient();
const server = () => import("./catalog.server");

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await db()).from("categories").select("id, name, slug, parent_id").order("name");
  if (error) throw fromDbError(error);
  return data ?? [];
});

export const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().max(80).optional(),
  sort: z.enum(["popular", "price_asc", "price_desc", "rating", "new"]).optional(),
  inStock: z.boolean().optional(),
  shop: z.string().uuid().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
});

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => searchSchema.parse(input ?? {}))
  .handler(async ({ data }) => (await server()).loadCards(await db(), data));

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const p = await (await server()).loadProduct(await db(), data.slug);
    if (!p) throw notFound();
    return p;
  });

export const listActiveShops = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => (await server()).loadShops(await db(), data.lat, data.lng));

export const checkCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).max(50) }).parse(input))
  .handler(async ({ data }) => (await server()).checkCart(await db(), data.items));

export const listCities = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await db()).from("cities").select("id, name").order("name");
  if (error) throw fromDbError(error);
  return data ?? [];
});
