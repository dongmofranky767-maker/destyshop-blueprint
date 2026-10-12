import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { meQueryOptions, useMe } from "@/modules/auth/use-me";
import { ROLE_LABELS } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — Destyshop" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions),
  component: AccountPage,
});

function AccountPage() {
  const { profile, roles } = useMe();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Mon compte</h1>
        <div className="mt-6 rounded-xl border bg-card p-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm text-muted-foreground">Nom</dt><dd>{profile?.full_name ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Email</dt><dd>{profile?.email ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Téléphone</dt><dd>{profile?.phone ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Rôles</dt>
              <dd className="flex flex-wrap gap-1">{roles.map((r, i) => <Badge key={i} variant="secondary">{ROLE_LABELS[r.role]}</Badge>)}</dd></div>
          </dl>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Commandes et historique d'achats : disponibles dans une prochaine étape.</p>
      </main>
    </div>
  );
}
