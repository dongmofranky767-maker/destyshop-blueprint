// RBAC central — miroir de docs/RBAC.md. La base (RLS) reste la source d'autorité.
export const ROLES = ["client", "employee", "shop_admin", "network_admin", "it_admin"] as const;
export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  client: "Client",
  employee: "Employé",
  shop_admin: "Administrateur de boutique",
  network_admin: "Super-Administrateur réseau",
  it_admin: "Administrateur technique (IT)",
};

export const SHOP_SCOPED_ROLES: AppRole[] = ["employee", "shop_admin"];

export type RoleAssignment = { role: AppRole; shop_id: string | null };

export const PERMISSIONS = {
  "catalog:browse": ["client", "employee", "shop_admin", "network_admin"],
  "order:place": ["client"],
  "pos:use": ["employee", "shop_admin"],
  "stock:move": ["employee", "shop_admin"],
  "stock:validate": ["shop_admin"],
  "orders:process": ["employee", "shop_admin"],
  "employees:manage": ["shop_admin"],
  "shop:kpi": ["shop_admin", "network_admin"],
  "election:participate": ["employee", "shop_admin"],
  "election:manage": ["network_admin"],
  "shops:manage": ["network_admin"],
  "network:view": ["network_admin"],
  "disputes:arbitrate": ["network_admin"],
  "users:view": ["network_admin", "it_admin"],
  "roles:manage": ["network_admin", "it_admin"],
  "system:manage": ["it_admin"],
  "audit:view": ["shop_admin", "network_admin", "it_admin"],
  "backoffice:access": ["employee", "shop_admin", "network_admin", "it_admin"],
} as const satisfies Record<string, readonly AppRole[]>;
export type Permission = keyof typeof PERMISSIONS;

export function hasRole(roles: RoleAssignment[], role: AppRole, shopId?: string) {
  return roles.some((r) => r.role === role && (shopId === undefined || r.shop_id === shopId));
}

export function can(roles: RoleAssignment[], permission: Permission, shopId?: string) {
  const allowed = PERMISSIONS[permission] as readonly AppRole[];
  return roles.some(
    (r) =>
      allowed.includes(r.role) &&
      (shopId === undefined || !SHOP_SCOPED_ROLES.includes(r.role) || r.shop_id === shopId),
  );
}

/** Rôles qu'un acteur peut attribuer (règles de docs/RBAC.md). */
export function assignableRoles(roles: RoleAssignment[]): AppRole[] {
  if (hasRole(roles, "it_admin")) return [...ROLES];
  if (hasRole(roles, "network_admin")) return ["employee", "shop_admin"];
  if (hasRole(roles, "shop_admin")) return ["employee"];
  return [];
}
