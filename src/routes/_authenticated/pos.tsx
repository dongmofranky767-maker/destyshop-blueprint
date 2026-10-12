import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { meQueryOptions } from "@/modules/auth/use-me";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "Caisse — Destyshop" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!can(me.roles, "pos:use")) throw redirect({ to: "/acces-refuse" });
  },
  component: Pos,
});

function Pos() {
  return (
    <div className="grid min-h-screen bg-secondary text-secondary-foreground md:grid-cols-[1fr_360px]">
      <section className="p-6">
        <h1 className="text-2xl font-semibold">Caisse</h1>
        <p className="mt-2 text-secondary-foreground/70">Scan ou sélection des produits — module POS à l'étape 3.</p>
      </section>
      <aside className="flex flex-col bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Ticket</h2>
        <div className="flex-1" />
        <button disabled className="rounded-lg bg-primary py-4 text-lg font-semibold text-primary-foreground opacity-60">Encaisser</button>
        <Link to="/staff" className="mt-4 text-center text-sm text-muted-foreground underline">Back-office</Link>
      </aside>
    </div>
  );
}
