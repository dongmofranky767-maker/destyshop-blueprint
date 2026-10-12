import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getMe } from "./auth.functions";
import { can, type Permission } from "@/lib/rbac";

export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: () => getMe(),
  staleTime: 60_000,
});

export function useMe() {
  const { data } = useSuspenseQuery(meQueryOptions);
  return { ...data, can: (p: Permission, shopId?: string) => can(data.roles, p, shopId) };
}
