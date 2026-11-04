import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "@package/auth";

import { getShoppingList, type ShoppingListQuery } from "./api";

export const shoppingListQueryKeys = {
  all: ["shopping-list"] as const,
  byUser: (userId: number | null) => [...shoppingListQueryKeys.all, userId] as const,
  range: (userId: number | null, { dateFrom, dateTo, planIds }: ShoppingListQuery) =>
    [...shoppingListQueryKeys.byUser(userId), dateFrom, dateTo, planIds] as const,
};

export const useShoppingListQuery = (query: ShoppingListQuery, enabled = true) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: shoppingListQueryKeys.range(user?.id ?? null, query),
    queryFn: () => getShoppingList(request, query),
    enabled: Boolean(
      enabled && user && query.dateFrom && query.dateTo && query.planIds.length
    ),
  });
};
