import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/acces-refuse")({
  head: () => ({
    meta: [
      { title: "Accès refusé — Destyshop" },
      { name: "description", content: "Vous n'avez pas les droits pour accéder à cette page." },
      { property: "og:title", content: "Accès refusé — Destyshop" },
      { property: "og:description", content: "Droits insuffisants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="mt-2 text-muted-foreground">Votre compte n'a pas les droits nécessaires pour cette page.</p>
        <Button asChild className="mt-6"><Link to="/">Retour à l'accueil</Link></Button>
      </div>
    </div>
  ),
});
