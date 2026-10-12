import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsers, assignRole, revokeRole } from "@/modules/users/users.functions";
import { listShops } from "@/modules/shops/shops.functions";
import { meQueryOptions, useMe } from "@/modules/auth/use-me";
import { assignableRoles, can, ROLE_LABELS, SHOP_SCOPED_ROLES, type AppRole } from "@/lib/rbac";
import { userMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const usersQuery = queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });
const shopsQuery = queryOptions({ queryKey: ["shops"], queryFn: () => listShops() });

export const Route = createFileRoute("/_authenticated/staff/utilisateurs")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!can(me.roles, "users:view")) throw redirect({ to: "/acces-refuse" });
  },
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(usersQuery), context.queryClient.ensureQueryData(shopsQuery)]),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(usersQuery);
  const { data: shops } = useSuspenseQuery(shopsQuery);
  const { roles: myRoles } = useMe();
  const options = assignableRoles(myRoles);
  const qc = useQueryClient();
  const assign = useServerFn(assignRole);
  const revoke = useServerFn(revokeRole);

  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });
  async function onRevoke(roleId: string) {
    try { await revoke({ data: { roleId } }); toast.success("Rôle retiré."); refresh(); }
    catch (e) { toast.error(userMessage(e)); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Utilisateurs & rôles</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôles</TableHead><TableHead>Ajouter un rôle</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell><p className="font-medium">{u.full_name ?? "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="gap-1">
                        {ROLE_LABELS[r.role as AppRole]}{r.shops?.name ? ` · ${r.shops.name}` : ""}
                        {options.includes(r.role as AppRole) && (
                          <button aria-label="Retirer" className="ml-1 text-muted-foreground hover:text-destructive" onClick={() => onRevoke(r.id)}>×</button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {options.length > 0 && <AssignForm userId={u.id} options={options} shops={shops} onDone={refresh} assign={assign} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AssignForm({ userId, options, shops, onDone, assign }: {
  userId: string; options: AppRole[]; shops: { id: string; name: string }[]; onDone: () => void;
  assign: ReturnType<typeof useServerFn<typeof assignRole>>;
}) {
  const [role, setRole] = useState<AppRole | "">("");
  const [shopId, setShopId] = useState("");
  const needsShop = role !== "" && SHOP_SCOPED_ROLES.includes(role);
  async function submit() {
    if (!role) return;
    try {
      await assign({ data: { userId, role, shopId: needsShop ? shopId : null } });
      toast.success("Rôle attribué.");
      setRole(""); setShopId(""); onDone();
    } catch (e) { toast.error(userMessage(e)); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Rôle" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{ROLE_LABELS[o]}</SelectItem>)}</SelectContent>
      </Select>
      {needsShop && (
        <Select value={shopId} onValueChange={setShopId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Boutique" /></SelectTrigger>
          <SelectContent>{shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Button size="sm" onClick={submit} disabled={!role || (needsShop && !shopId)}>Ajouter</Button>
    </div>
  );
}
