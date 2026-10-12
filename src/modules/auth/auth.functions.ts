import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fromDbError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { RoleAssignment } from "@/lib/rbac";

/** Profil + rôles de l'utilisateur connecté (vérifié côté serveur). */
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, roles] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, status").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role, shop_id").eq("user_id", userId),
    ]);
    if (profile.error || roles.error) {
      logger.error("auth.getMe", "lecture profil/rôles échouée", { userId, err: profile.error?.message ?? roles.error?.message });
      throw fromDbError(profile.error ?? roles.error);
    }
    return { profile: profile.data, roles: (roles.data ?? []) as RoleAssignment[] };
  });
