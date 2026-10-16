import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, fromDbError } from "@/lib/errors";

/** Note + avis produit. Un avis par client et par produit : une nouvelle soumission remplace la précédente. */
export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: e1 } = await supabase.from("reviews").select("id")
      .eq("author_id", userId).eq("product_id", data.productId).maybeSingle();
    if (e1) throw fromDbError(e1);
    const payload = { rating: data.rating, comment: data.comment || null };
    const { error } = existing
      ? await supabase.from("reviews").update(payload).eq("id", existing.id)
      : await supabase.from("reviews").insert({ ...payload, author_id: userId, target: "product", product_id: data.productId });
    if (error) throw fromDbError(error);
    return { ok: true, updated: !!existing };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("reviews").delete({ count: "exact" }).eq("id", data.id).eq("author_id", context.userId);
    if (error) throw fromDbError(error);
    if (!count) throw new AppError("NOT_FOUND");
    return { ok: true };
  });
