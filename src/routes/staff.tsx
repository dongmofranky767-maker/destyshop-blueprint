import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo-destyshop.jpg";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Back-office — Destyshop" },
      { name: "description", content: "Espace de gestion des boutiques Destyshop : stock, commandes, employés, élections." },
      { property: "og:title", content: "Back-office — Destyshop" },
      { property: "og:description", content: "Gestion des boutiques du réseau Destyshop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Staff,
});

const sections = ["Tableau de bord", "Stock", "Commandes", "Employés", "Ventes", "Élections", "Litiges", "Retours", "Réseau", "Technique", "Audit"];

function Staff() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <img src={logo} alt="Destyshop" className="mb-6 h-14 w-14 rounded-full" />
        {sections.map((s) => (
          <span key={s} className="rounded-md px-3 py-2 text-sm text-sidebar-foreground/60">{s}</span>
        ))}
      </aside>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">Back-office</h1>
        <p className="mt-2 text-muted-foreground">Cet espace sera construit à l'étape suivante (connexion, rôles, stock).</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">Retour au site</Link>
      </main>
    </div>
  );
}
