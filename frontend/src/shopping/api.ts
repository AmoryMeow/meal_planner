import type { AuthenticatedRequest } from "@package/auth";

export type ShoppingListItem = {
  name: string;
  quantity: string;
  unit: string;
};

export type ShoppingListQuery = {
  dateFrom: string;
  dateTo: string;
  planIds: number[];
};

export const getShoppingList = (
  request: AuthenticatedRequest,
  { dateFrom, dateTo, planIds }: ShoppingListQuery
) => {
  const query = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    plan_ids: planIds.join(","),
  });

  return request<ShoppingListItem[]>(`/shopping-list/?${query.toString()}`);
};
