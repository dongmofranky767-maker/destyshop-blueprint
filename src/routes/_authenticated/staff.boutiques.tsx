import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listShops, createShop } from "@/modules/shops/shops.functions";
import { shopInputSchema } from "@/modules/shops/schemas";
import { useMe } from "@/modules/auth/use-me";
import { userMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const shopsQuery = queryOptions({ queryKey: ["shops"], queryFn: () => listShops() });
const STATUS: Record<string, string> = { draft: "Brouillon", active: "Active", closed: "Fermée" };

export const Route = createFileRoute("/_authenticated/staff/boutiques")({
  loader: ({ context }) => context.queryClient.ensureQueryData(shopsQuery),
  component: ShopsPage,
});

function ShopsPage() {
  const { data: shops } = useSuspenseQuery(shopsQuery);
  const { can } = useMe();
  const qc = useQueryClient();
  const create = useServerFn(createShop);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const parsed = shopInputSchema.safeParse({ code: raw['code']?.toUpperCase(), name: raw['name'], address: raw['address'] || undefined, phone: raw['phone'] || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    try {
      await create({ data: parsed.data });
      toast.success("Boutique créée (statut brouillon).");
      form.reset();
      qc.invalidateQueries({ queryKey: ["shops"] });
    } catch (err) { toast.error(userMessage(err)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Boutiques</h1>
      {can("shops:manage") && (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5 md:items-end">
          <div className="space-y-1"><Label htmlFor="code">Code</Label><Input id="code" name="code" placeholder="DLA-02" required /></div>
          <div className="space-y-1 md:col-span-2"><Label htmlFor="name">Nom</Label><Input id="name" name="name" required /></div>
          <div className="space-y-1"><Label htmlFor="address">Adresse</Label><Input id="address" name="address" /></div>
          <Button type="submit" disabled={busy}>Ajouter</Button>
          <input type="hidden" name="phone" />
        </form>
      )}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Ville</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {shops.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.cities?.name ?? "—"}</TableCell>
                <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{STATUS[s.status]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
