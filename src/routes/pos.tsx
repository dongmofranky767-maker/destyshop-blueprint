import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Caisse — Destyshop" },
      { name: "description", content: "Interface de caisse des boutiques Destyshop." },
      { property: "og:title", content: "Caisse — Destyshop" },
      { property: "og:description", content: "Vente en boutique Destyshop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pos,
});

function Pos() {
  return (
    <div className="grid min-h-screen bg-secondary text-secondary-foreground md:grid-cols-[1fr_360px]">
      <section className="p-6">
        <h1 className="text-2xl font-semibold">Caisse</h1>
        <p className="mt-2 text-secondary-foreground/70">Scan ou sélection des produits — disponible à l'étape 3.</p>
      </section>
      <aside className="flex flex-col bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Ticket</h2>
        <div className="flex-1" />
        <button disabled className="rounded-lg bg-primary py-4 text-lg font-semibold text-primary-foreground opacity-60">Encaisser</button>
        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground underline">Retour au site</Link>
      </aside>
    </div>
  );
}
