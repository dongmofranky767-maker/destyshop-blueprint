import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo-destyshop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Destyshop — Le plaisir à petit prix" },
      { name: "description", content: "Achetez en ligne chez Destyshop et choisissez retrait en boutique, expédition ou livraison à domicile partout au Cameroun." },
      { property: "og:title", content: "Destyshop — Le plaisir à petit prix" },
      { property: "og:description", content: "Le réseau de boutiques Destyshop, en ligne et près de chez vous au Cameroun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const modes = [
  { t: "Retrait en boutique", d: "Récupérez votre commande dans la boutique Destyshop de votre choix." },
  { t: "Expédition", d: "Envoi par transporteur vers les autres villes et régions." },
  { t: "Livraison à domicile", d: "Un livreur proche de la boutique vous apporte votre commande." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <img src={logo} alt="Destyshop" className="h-12 w-auto rounded-full" />
          <nav className="flex gap-2 text-sm">
            <Link to="/staff" className="rounded-md px-3 py-2 hover:bg-sidebar-accent">Espace équipe</Link>
            <Link to="/pos" className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Caisse</Link>
          </nav>
        </div>
      </header>
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-5xl text-primary md:text-6xl">DestyShop</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-wide md:text-3xl">LE PLAISIR À PETIT PRIX</h1>
          <p className="mx-auto mt-4 max-w-xl text-secondary-foreground/70">
            Bientôt : trouvez la boutique la plus proche qui a votre produit, commandez en ligne et payez par Mobile Money ou carte.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        {modes.map((m) => (
          <div key={m.t} className="rounded-xl border bg-card p-6">
            <div className="mb-3 h-1 w-10 rounded-full bg-primary" />
            <h2 className="font-semibold">{m.t}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{m.d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© Destyshop — Cameroun</footer>
    </div>
  );
}
