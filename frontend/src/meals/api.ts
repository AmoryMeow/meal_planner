import type { AuthenticatedRequest } from "@package/auth";

export type MealSource = "home" | "restaurant" | "delivery";

export type Ingredient = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type MealIngredient = {
  id: number;
  ingredient_id: number;
  name: string;
  quantity: string;
  unit: string;
};

export type MealTag = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type MealTagFilterOption = {
  value: string;
  label: string;
};

export type CreateIngredientInput = {
  name: string;
};

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

export type CreateMealIngredientInput = {
  ingredient_id: number;
  quantity: string;
  unit: string;
};

export type UpdateMealIngredientInput = Partial<CreateMealIngredientInput>;

export type Meal = {
  id: number;
  name: string;
  source: MealSource;
  servings: number;
  tags: MealTag[];
  instructions: string;
  ingredients: MealIngredient[];
  is_owner: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CreateMealInput = {
  name: string;
  source?: MealSource;
  servings?: number;
  tag_ids?: number[];
  instructions?: string;
};

export type UpdateMealInput = Partial<CreateMealInput>;

export type MealAccessFilter = "all" | "owned" | "shared";
export type MealOrdering = "recent" | "name";

export type MealFilters = {
  search?: string;
  sources?: MealSource[];
  tags?: string[];
  access?: MealAccessFilter;
  ordering?: MealOrdering;
  page?: number;
};

export type MealShareAccess = "read" | "edit";

export type MealShare = {
  id: number;
  group_id: number;
  group_name: string;
  group_color: string;
  access: MealShareAccess;
  created_at: string;
  updated_at: string;
};

export type CreateMealShareInput = Pick<MealShare, "group_id" | "access">;
export type UpdateMealShareInput = Pick<MealShare, "access">;

export const getMeals = (request: AuthenticatedRequest, filters: MealFilters = {}) => {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  filters.sources?.forEach(source => query.append("source", source));
  filters.tags?.forEach(tag => query.append("tag", tag));
  if (filters.access && filters.access !== "all") query.set("access", filters.access);
  if (filters.ordering && filters.ordering !== "recent") {
    query.set("ordering", filters.ordering);
  }
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  const suffix = query.size ? `?${query.toString()}` : "";

  return request<PaginatedResponse<Meal>>(`/meals/${suffix}`);
};

export const getMeal = (request: AuthenticatedRequest, mealId: number) =>
  request<Meal>(`/meals/${mealId}/`);

export const createMeal = (request: AuthenticatedRequest, input: CreateMealInput) =>
  request<Meal>("/meals/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMeal = (
  request: AuthenticatedRequest,
  mealId: number,
  input: UpdateMealInput
) =>
  request<Meal>(`/meals/${mealId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteMeal = (request: AuthenticatedRequest, mealId: number) =>
  request<void>(`/meals/${mealId}/`, {
    method: "DELETE",
  });

export const getMealShares = (request: AuthenticatedRequest, mealId: number) =>
  request<MealShare[]>(`/meals/${mealId}/shares/`);

export const createMealShare = (
  request: AuthenticatedRequest,
  mealId: number,
  input: CreateMealShareInput
) =>
  request<MealShare>(`/meals/${mealId}/shares/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMealShare = (
  request: AuthenticatedRequest,
  mealId: number,
  shareId: number,
  input: UpdateMealShareInput
) =>
  request<MealShare>(`/meals/${mealId}/shares/${shareId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteMealShare = (
  request: AuthenticatedRequest,
  mealId: number,
  shareId: number
) =>
  request<void>(`/meals/${mealId}/shares/${shareId}/`, {
    method: "DELETE",
  });

export const getIngredientCatalog = (request: AuthenticatedRequest, search = "") => {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  const suffix = query.size ? `?${query.toString()}` : "";

  return request<PaginatedResponse<Ingredient>>(`/ingredients/${suffix}`);
};

export const getIngredient = (request: AuthenticatedRequest, ingredientId: number) =>
  request<Ingredient>(`/ingredients/${ingredientId}/`);

export const createIngredient = (
  request: AuthenticatedRequest,
  input: CreateIngredientInput
) =>
  request<Ingredient>("/ingredients/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getMealIngredientCatalog = (
  request: AuthenticatedRequest,
  mealId: number,
  search = ""
) => {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  const suffix = query.size ? `?${query.toString()}` : "";

  return request<PaginatedResponse<Ingredient>>(
    `/meals/${mealId}/ingredient-catalog/${suffix}`
  );
};

export const createMealCatalogIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  input: CreateIngredientInput
) =>
  request<Ingredient>(`/meals/${mealId}/ingredient-catalog/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateIngredient = (
  request: AuthenticatedRequest,
  ingredientId: number,
  input: UpdateIngredientInput
) =>
  request<Ingredient>(`/ingredients/${ingredientId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getMealIngredients = (request: AuthenticatedRequest, mealId: number) =>
  request<PaginatedResponse<MealIngredient>>(`/meals/${mealId}/ingredients/`);

export const getMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  mealIngredientId: number
) => request<MealIngredient>(`/meals/${mealId}/ingredients/${mealIngredientId}/`);

export const createMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  input: CreateMealIngredientInput
) =>
  request<MealIngredient>(`/meals/${mealId}/ingredients/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  mealIngredientId: number,
  input: UpdateMealIngredientInput
) =>
  request<MealIngredient>(`/meals/${mealId}/ingredients/${mealIngredientId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  mealIngredientId: number
) =>
  request<void>(`/meals/${mealId}/ingredients/${mealIngredientId}/`, {
    method: "DELETE",
  });

const getCatalogSuffix = (search: string) => {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  return query.size ? `?${query.toString()}` : "";
};

export const getTagCatalog = (request: AuthenticatedRequest, search = "") =>
  request<PaginatedResponse<MealTag>>(`/tags/${getCatalogSuffix(search)}`);

export const createTag = (request: AuthenticatedRequest, name: string) =>
  request<MealTag>("/tags/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const getMealTagCatalog = (
  request: AuthenticatedRequest,
  mealId: number,
  search = ""
) =>
  request<PaginatedResponse<MealTag>>(
    `/meals/${mealId}/tag-catalog/${getCatalogSuffix(search)}`
  );

export const createMealCatalogTag = (
  request: AuthenticatedRequest,
  mealId: number,
  name: string
) =>
  request<MealTag>(`/meals/${mealId}/tag-catalog/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const getMealTagFilterOptions = (request: AuthenticatedRequest, search = "") =>
  request<MealTagFilterOption[]>(`/meal-tags/${getCatalogSuffix(search)}`);
