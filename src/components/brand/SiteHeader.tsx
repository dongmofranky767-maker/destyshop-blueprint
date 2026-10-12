import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-destyshop.jpg";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/"><img src={logo} alt="Destyshop" className="h-11 w-11 rounded-full object-cover" /></Link>
        <nav className="flex items-center gap-2 text-sm">
          {email ? (
            <>
              <Link to="/compte" className="rounded-md px-3 py-2 hover:bg-sidebar-accent">Mon compte</Link>
              <Link to="/staff" className="hidden rounded-md px-3 py-2 hover:bg-sidebar-accent sm:inline">Espace équipe</Link>
              <Button size="sm" variant="outline" className="border-sidebar-border bg-transparent text-secondary-foreground hover:bg-sidebar-accent hover:text-secondary-foreground" onClick={signOut}>Déconnexion</Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Se connecter</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
