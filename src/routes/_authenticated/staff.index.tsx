import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMe } from "@/modules/auth/use-me";
import { checkHealth } from "@/modules/system/health.functions";
import { ROLE_LABELS } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const healthQuery = queryOptions({ queryKey: ["health"], queryFn: () => checkHealth() });

export const Route = createFileRoute("/_authenticated/staff/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(healthQuery),
  component: Dashboard,
});

function Dashboard() {
  const { profile, roles } = useMe();
  const { data: health } = useSuspenseQuery(healthQuery);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour {profile?.full_name ?? ""}</h1>
        <p className="text-muted-foreground">Les tableaux de bord métier arriveront avec les prochains modules.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Vos rôles</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {roles.map((r, i) => <p key={i}>{ROLE_LABELS[r.role]}</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Base de données</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className={health.db === "up" ? "text-primary font-medium" : "text-destructive font-medium"}>
              {health.db === "up" ? "Connectée" : "Indisponible"}
            </p>
            {health.db === "up" && <p className="text-muted-foreground">{health.activeShops} boutique(s) active(s) · {health.latencyMs} ms</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Statut du compte</CardTitle></CardHeader>
          <CardContent className="text-sm">{profile?.status === "active" ? "Actif" : profile?.status}</CardContent>
        </Card>
      </div>
    </div>
  );
}
