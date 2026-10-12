import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo-destyshop.jpg";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Connexion — Destyshop" },
      { name: "description", content: "Connectez-vous ou créez votre compte Destyshop." },
      { property: "og:title", content: "Connexion — Destyshop" },
      { property: "og:description", content: "Accédez à votre compte Destyshop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});
const signupSchema = credentials.extend({
  full_name: z.string().trim().min(2, "Nom requis").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,15}$/, "Téléphone invalide").optional().or(z.literal("")),
});

function safeRedirect(r?: string) {
  if (!r) return "/compte";
  try {
    const u = new URL(r, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/compte";
  } catch { return "/compte"; }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = credentials.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error("Email ou mot de passe incorrect.");
    navigate({ to: safeRedirect(redirect) });
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    setLoading(true);
    const { email, password, full_name, phone } = parsed.data;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name, phone: phone || null } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <Link to="/" className="mx-auto mb-4 block w-fit"><img src={logo} alt="Destyshop" className="h-20 w-20 rounded-full object-cover" /></Link>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer un compte</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={onLogin} className="mt-4 space-y-4">
              <Field id="email" label="Email" type="email" autoComplete="email" />
              <Field id="password" label="Mot de passe" type="password" autoComplete="current-password" />
              <Button type="submit" className="w-full" disabled={loading}>Se connecter</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={onSignup} className="mt-4 space-y-4">
              <Field id="full_name" label="Nom complet" autoComplete="name" />
              <Field id="email" label="Email" type="email" autoComplete="email" />
              <Field id="phone" label="Téléphone (facultatif)" type="tel" autoComplete="tel" required={false} />
              <Field id="password" label="Mot de passe" type="password" autoComplete="new-password" />
              <Button type="submit" className="w-full" disabled={loading}>Créer mon compte</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ id, label, required = true, ...props }: { id: string; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required={required} {...props} />
    </div>
  );
}
