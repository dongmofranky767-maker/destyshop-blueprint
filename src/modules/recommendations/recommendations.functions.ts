import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { distanceKm } from "@/lib/geo";
import type { ProductCard } from "@/modules/catalog/types";

/**
 * Pondérations des critères de suggestion du cahier (distance, disponibilité, préférences/historique,
 * popularité, notes, promotions). Valeurs PROVISOIRES : le cahier ne fixe pas de pondération (voir docs/DECISIONS.md).
 * Promotions : poids neutre tant que le module promotions n'existe pas.
 */
export const SUGGESTION_WEIGHTS = { distance: 0.3, availability: 0.2, preference: 0.2, popularity: 0.15, rating: 0.15, promotion: 0 };

export type Suggestion = ProductCard & { score: number; nearestShopKm: number | null; reasons: string[] };

export const getSuggestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    preferredCategoryIds: z.array(z.string().uuid()).max(20).default([]),
    excludeProductIds: z.array(z.string().uuid()).max(50).default([]),
    limit: z.number().int().min(1).max(24).default(8),
  }).parse(input ?? {}))
  .handler(async ({ data }): Promise<Suggestion[]> => {
    const { createPublicClient } = await import("@/lib/supabase-public.server");
    const { loadCards, loadShops } = await import("@/modules/catalog/catalog.server");
    const db = createPublicClient();
    const [cards, shops] = await Promise.all([loadCards(db, { inStock: true }), loadShops(db)]);
    const hasGeo = data.lat !== undefined && data.lng !== undefined;
    const maxSold = Math.max(1, ...cards.map((c) => c.soldQty));
    const prefs = new Set(data.preferredCategoryIds);
    return cards
      .filter((c) => !data.excludeProductIds.includes(c.id))
      .map((c) => {
        let nearest: number | null = null;
        if (hasGeo) for (const s of shops) {
          if ((c.stockByShop[s.id] ?? 0) <= 0 || s.lat === null || s.lng === null) continue;
          const d = distanceKm(data.lat!, data.lng!, s.lat, s.lng);
          if (nearest === null || d < nearest) nearest = d;
        }
        const f = {
          distance: nearest === null ? 0.5 : 1 / (1 + nearest / 10),
          availability: Math.min(c.available, 10) / 10,
          preference: c.category && prefs.has(c.category.id) ? 1 : 0,
          popularity: c.soldQty / maxSold,
          rating: (c.avgRating ?? 0) / 5,
          promotion: 0,
        };
        const score = (Object.keys(f) as (keyof typeof f)[]).reduce((a, k) => a + f[k] * SUGGESTION_WEIGHTS[k], 0);
        const reasons: string[] = [];
        if (nearest !== null && nearest < 15) reasons.push("Près de chez vous");
        if (f.preference) reasons.push("Selon vos achats");
        if (c.avgRating !== null && c.avgRating >= 4) reasons.push("Très bien noté");
        if (c.soldQty > 0 && f.popularity >= 0.6) reasons.push("Populaire");
        return { ...c, score, nearestShopKm: nearest, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, data.limit);
  });
