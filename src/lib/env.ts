import { z } from "zod";

// Variables publiques (navigateur). Les secrets serveur se lisent dans les handlers via process.env.
const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function getPublicEnv() {
  const parsed = publicEnvSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    throw new Error("Configuration manquante : vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (voir .env.example).");
  }
  return parsed.data;
}
