// Logique de lecture du catalogue (côté serveur uniquement).
import { createPublicClient } from "@/lib/supabase-public.server";
import { fromDbError } from "@/lib/errors";
import type { CatalogSort, ProductCard, ProductDetail, ShopLite } from "./types";

type Db = ReturnType<typeof createPublicClient>;

const PRODUCT_SELECT =
  "id, slug, name, description, created_at, categories(id, name, slug), product_images(url, position), product_variants(id, sku, label, price_xaf, is_active, inventory(shop_id, quantity, reserved))";

export async function loadShops(db: Db, lat?: number, lng?: number): Promise<(ShopLite & { distanceKm: number | null })[]> {
  const { data, error } = await db.rpc("nearby_shops", lat !== undefined && lng !== undefined ? { _lat: lat, _lng: lng } : {});
  if (error) throw fromDbError(error);
  return (data ?? []).map((s) => ({
    id: s.id, code: s.code, name: s.name, address: s.address, phone: s.phone, city: s.city,
    lat: s.lat, lng: s.lng, distanceKm: s.distance_km,
  }));
}

type Row = {
  id: string; slug: string; name: string; description: string | null; created_at: string;
  categories: { id: string; name: string; slug: string } | null;
  product_images: { url: string; position: number }[];
  product_variants: { id: string; sku: string; label: string | null; price_xaf: number; is_active: boolean;
    inventory: { shop_id: string; quantity: number; reserved: number }[] }[];
};

function toCard(r: Row, activeShops: Set<string>, stats: Map<string, { sold: number; avg: number | null; count: number }>): ProductCard & { variantsRaw: Row["product_variants"]; images: string[] } {
  const variants = r.product_variants.filter((v) => v.is_active);
  const stockByShop: Record<string, number> = {};
  for (const v of variants) for (const i of v.inventory) {
    if (!activeShops.has(i.shop_id)) continue;
    stockByShop[i.shop_id] = (stockByShop[i.shop_id] ?? 0) + Math.max(0, i.quantity - i.reserved);
  }
  const prices = variants.map((v) => v.price_xaf);
  const images = [...r.product_images].sort((a, b) => a.position - b.position).map((i) => i.url);
  const st = stats.get(r.id);
  return {
    id: r.id, slug: r.slug, name: r.name, description: r.description, category: r.categories,
    image: images[0] ?? null, images,
    minPrice: prices.length ? Math.min(...prices) : 0, maxPrice: prices.length ? Math.max(...prices) : 0,
    available: Object.values(stockByShop).reduce((a, b) => a + b, 0), stockByShop,
    soldQty: st?.sold ?? 0, avgRating: st?.avg ?? null, reviewCount: st?.count ?? 0,
    createdAt: r.created_at, variantsRaw: variants,
  };
}

async function loadStats(db: Db) {
  const { data, error } = await db.rpc("product_stats");
  if (error) throw fromDbError(error);
  return new Map((data ?? []).map((s) => [s.product_id, { sold: Number(s.sold_qty), avg: s.avg_rating === null ? null : Number(s.avg_rating), count: Number(s.review_count) }]));
}

export type SearchInput = {
  q?: string; category?: string; sort?: CatalogSort; inStock?: boolean; shop?: string; minPrice?: number; maxPrice?: number;
};

export async function loadCards(db: Db, input: SearchInput = {}): Promise<ProductCard[]> {
  let query = db.from("products").select(PRODUCT_SELECT).eq("is_active", true);
  if (input.q) query = query.ilike("name", `%${input.q.replace(/[%_,()]/g, " ")}%`);
  const [{ data, error }, shops, stats] = await Promise.all([query, loadShops(db), loadStats(db)]);
  if (error) throw fromDbError(error);
  const active = new Set(shops.map((s) => s.id));
  // Volume de catalogue initial modeste : filtres appliqués ici. À déplacer en SQL (pg_trgm) quand le catalogue grossira.
  let cards = (data as unknown as Row[]).map((r) => {
    const { variantsRaw: _v, images: _i, ...card } = toCard(r, active, stats);
    return card;
  }).filter((c) => c.maxPrice > 0 || c.minPrice > 0);
  if (input.category) cards = cards.filter((c) => c.category?.slug === input.category);
  if (input.shop) cards = cards.filter((c) => (c.stockByShop[input.shop!] ?? 0) > 0);
  if (input.inStock) cards = cards.filter((c) => c.available > 0);
  if (input.minPrice !== undefined) cards = cards.filter((c) => c.maxPrice >= input.minPrice!);
  if (input.maxPrice !== undefined) cards = cards.filter((c) => c.minPrice <= input.maxPrice!);
  const sorters: Record<CatalogSort, (a: ProductCard, b: ProductCard) => number> = {
    popular: (a, b) => b.soldQty - a.soldQty || b.reviewCount - a.reviewCount,
    price_asc: (a, b) => a.minPrice - b.minPrice,
    price_desc: (a, b) => b.minPrice - a.minPrice,
    rating: (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0),
    new: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return cards.sort(sorters[input.sort ?? "popular"]);
}

export async function loadProduct(db: Db, slug: string): Promise<ProductDetail | null> {
  const [{ data, error }, shops, stats] = await Promise.all([
    db.from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("is_active", true).maybeSingle(),
    loadShops(db), loadStats(db),
  ]);
  if (error) throw fromDbError(error);
  if (!data) return null;
  const active = new Set(shops.map((s) => s.id));
  const { variantsRaw, ...card } = toCard(data as unknown as Row, active, stats);
  const { data: reviews, error: rErr } = await db.from("reviews")
    .select("id, author_id, rating, comment, created_at").eq("product_id", card.id).order("created_at", { ascending: false }).limit(50);
  if (rErr) throw fromDbError(rErr);
  return {
    ...card,
    variants: variantsRaw.map((v) => {
      const sb: Record<string, number> = {};
      for (const i of v.inventory) if (active.has(i.shop_id)) sb[i.shop_id] = Math.max(0, i.quantity - i.reserved);
      return { id: v.id, label: v.label, sku: v.sku, price: v.price_xaf, stockByShop: sb };
    }).sort((a, b) => a.price - b.price),
    shops: shops.map(({ distanceKm: _d, ...s }) => s),
    reviews: (reviews ?? []).map((r) => ({ id: r.id, authorId: r.author_id, rating: r.rating, comment: r.comment, createdAt: r.created_at })),
  };
}

/** Vérification indicative d'un panier : prix actuels + boutiques capables de tout servir. */
export async function checkCart(db: Db, items: { variantId: string; quantity: number }[]) {
  const ids = [...new Set(items.map((i) => i.variantId))];
  const [{ data, error }, shops] = await Promise.all([
    db.from("product_variants")
      .select("id, label, price_xaf, is_active, products(id, name, slug, is_active, product_images(url, position)), inventory(shop_id, quantity, reserved)")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    loadShops(db),
  ]);
  if (error) throw fromDbError(error);
  type V = { id: string; label: string | null; price_xaf: number; is_active: boolean;
    products: { id: string; name: string; slug: string; is_active: boolean; product_images: { url: string; position: number }[] } | null;
    inventory: { shop_id: string; quantity: number; reserved: number }[] };
  const byId = new Map((data as unknown as V[]).map((v) => [v.id, v]));
  const lines = items.map((i) => {
    const v = byId.get(i.variantId);
    const ok = !!v && v.is_active && !!v.products?.is_active;
    const img = v?.products?.product_images.sort((a, b) => a.position - b.position)[0]?.url ?? null;
    return {
      variantId: i.variantId, quantity: i.quantity, valid: ok,
      productName: v?.products?.name ?? "Article indisponible", productSlug: v?.products?.slug ?? null,
      label: v?.label ?? null, image: img, unitPrice: ok ? v!.price_xaf : 0,
      lineTotal: ok ? v!.price_xaf * i.quantity : 0,
    };
  });
  const shopResults = shops.map((s) => {
    const missing = items.flatMap((i) => {
      const inv = byId.get(i.variantId)?.inventory.find((x) => x.shop_id === s.id);
      const avail = inv ? Math.max(0, inv.quantity - inv.reserved) : 0;
      return avail >= i.quantity ? [] : [{ variantId: i.variantId, available: avail }];
    });
    return { shop: { id: s.id, code: s.code, name: s.name, address: s.address, phone: s.phone, city: s.city, lat: s.lat, lng: s.lng }, canFulfill: missing.length === 0, missing };
  });
  return { lines, total: lines.reduce((a, l) => a + l.lineTotal, 0), shops: shopResults };
}
