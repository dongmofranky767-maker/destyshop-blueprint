import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, fromDbError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ROLES, SHOP_SCOPED_ROLES, type AppRole } from "@/lib/rbac";

/** Liste des utilisateurs visibles (RLS : super-admin/IT = tous, admin boutique = ses employés). */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, email, phone, status, created_at").order("created_at", { ascending: false }).limit(200),
      context.supabase.from("user_roles").select("id, user_id, role, shop_id, shops(name)"),
    ]);
    if (profiles.error) throw fromDbError(profiles.error);
    if (roles.error) throw fromDbError(roles.error);
    return (profiles.data ?? []).map((p) => ({
      ...p,
      roles: (roles.data ?? []).filter((r) => r.user_id === p.id),
    }));
  });

const roleInput = z
  .object({ userId: z.string().uuid(), role: z.enum(ROLES), shopId: z.string().uuid().nullable() })
  .refine((v) => (SHOP_SCOPED_ROLES.includes(v.role as AppRole) ? !!v.shopId : !v.shopId), {
    message: "Les rôles employé et admin boutique exigent une boutique ; les autres n'en ont pas.",
  });

/** Attribution d'un rôle. Les droits réels sont imposés par les politiques RLS de user_roles. */
export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role, shop_id: data.shopId, created_by: context.userId });
    if (error) {
      logger.warn("users.assignRole", "refus", { by: context.userId, code: error.code });
      throw fromDbError(error);
    }
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ roleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("user_roles").delete({ count: "exact" }).eq("id", data.roleId);
    if (error) throw fromDbError(error);
    if (!count) throw new AppError("FORBIDDEN");
    return { ok: true };
  });
