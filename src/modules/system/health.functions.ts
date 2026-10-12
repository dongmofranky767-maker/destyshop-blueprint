import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

/** Vérification publique de la connexion à la base (lecture d'une table publique). */
export const checkHealth = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { db: "unconfigured" as const };
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const started = Date.now();
  const { count, error } = await client.from("shops").select("id", { count: "exact", head: true });
  if (error) {
    logger.error("health", "base injoignable", { err: error.message });
    return { db: "down" as const };
  }
  return { db: "up" as const, activeShops: count ?? 0, latencyMs: Date.now() - started };
});
