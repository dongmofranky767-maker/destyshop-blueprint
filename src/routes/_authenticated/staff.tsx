import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { meQueryOptions, useMe } from "@/modules/auth/use-me";
import { can, ROLE_LABELS, type Permission } from "@/lib/rbac";
import logo from "@/assets/logo-destyshop.jpg";

// Back-office : réservé au personnel (employé, admin boutique, super-admin, IT).
export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Back-office — Destyshop" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!can(me.roles, "backoffice:access")) throw redirect({ to: "/acces-refuse" });
  },
  component: StaffLayout,
});

const NAV: { to: "/staff" | "/staff/boutiques" | "/staff/utilisateurs" | "/pos"; label: string; perm: Permission }[] = [
  { to: "/staff", label: "Tableau de bord", perm: "backoffice:access" },
  { to: "/staff/boutiques", label: "Boutiques", perm: "backoffice:access" },
  { to: "/staff/utilisateurs", label: "Utilisateurs & rôles", perm: "users:view" },
  { to: "/pos", label: "Caisse (POS)", perm: "pos:use" },
];
const UPCOMING = ["Stock", "Commandes", "Ventes", "Élections", "Litiges", "Retours", "Audit"];

function StaffLayout() {
  const { profile, roles, can: allowed } = useMe();
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex flex-col bg-sidebar p-4 text-sidebar-foreground md:w-64">
        <Link to="/" className="mb-4 flex items-center gap-3">
          <img src={logo} alt="Destyshop" className="h-11 w-11 rounded-full object-cover" />
          <span className="font-semibold">Back-office</span>
        </Link>
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
          {NAV.filter((n) => allowed(n.perm)).map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}>
              {n.label}
            </Link>
          ))}
          {UPCOMING.map((u) => (
            <span key={u} className="hidden rounded-md px-3 py-2 text-sm text-sidebar-foreground/40 md:block">{u} · bientôt</span>
          ))}
        </nav>
        <div className="mt-auto hidden pt-6 text-xs text-sidebar-foreground/60 md:block">
          <p className="font-medium text-sidebar-foreground">{profile?.full_name ?? profile?.email}</p>
          {[...new Set(roles.map((r) => ROLE_LABELS[r.role]))].join(" · ")}
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
