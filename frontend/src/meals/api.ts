import type { RequiredFields } from "@package/api";
import type {
  Ingredient,
  IngredientRequest,
  Meal as GeneratedMeal,
  MealIngredient,
  MealIngredientRequest,
  MealRequest,
  MealShare as GeneratedMealShare,
  MealShareRequest,
  MealTagFilterOption,
  PaginatedIngredientList,
  PaginatedMealIngredientList,
  PaginatedMealList,
  PaginatedTagList,
  PatchedIngredientRequest,
  PatchedMealIngredientRequest,
  PatchedMealRequest,
  PatchedMealShareRequest,
  SourceEnum,
  Tag,
} from "@package/api/generated/schema";
import type { AuthenticatedRequest } from "@package/auth";

export type Meal = RequiredFields<
  GeneratedMeal,
  "source" | "servings" | "instructions"
>;

export type MealAccessFilter = "all" | "owned" | "shared";
export type MealOrdering = "recent" | "name";

export type MealFilters = {
  search?: string;
  sources?: SourceEnum[];
  tags?: string[];
  access?: MealAccessFilter;
  ordering?: MealOrdering;
  page?: number;
};

export type MealShare = RequiredFields<GeneratedMealShare, "group_id" | "access">;

type MealListResponse = Omit<PaginatedMealList, "results"> & {
  results: Meal[];
};

export type {
  AccessEnum as MealShareAccess,
  Ingredient,
  IngredientRequest as CreateIngredientInput,
  MealIngredient,
  MealIngredientRequest as CreateMealIngredientInput,
  MealRequest as CreateMealInput,
  MealShareRequest as CreateMealShareInput,
  MealTagFilterOption,
  PatchedIngredientRequest as UpdateIngredientInput,
  PatchedMealIngredientRequest as UpdateMealIngredientInput,
  PatchedMealRequest as UpdateMealInput,
  PatchedMealShareRequest as UpdateMealShareInput,
  SourceEnum as MealSource,
  Tag as MealTag,
} from "@package/api/generated/schema";

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

  return request<MealListResponse>(`/meals/${suffix}`);
};

export const getMeal = (request: AuthenticatedRequest, mealId: number) =>
  request<Meal>(`/meals/${mealId}/`);

export const createMeal = (request: AuthenticatedRequest, input: MealRequest) =>
  request<Meal>("/meals/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMeal = (
  request: AuthenticatedRequest,
  mealId: number,
  input: PatchedMealRequest
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
  input: MealShareRequest
) =>
  request<MealShare>(`/meals/${mealId}/shares/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMealShare = (
  request: AuthenticatedRequest,
  mealId: number,
  shareId: number,
  input: PatchedMealShareRequest
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

  return request<PaginatedIngredientList>(`/ingredients/${suffix}`);
};

export const getIngredient = (request: AuthenticatedRequest, ingredientId: number) =>
  request<Ingredient>(`/ingredients/${ingredientId}/`);

export const createIngredient = (
  request: AuthenticatedRequest,
  input: IngredientRequest
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

  return request<PaginatedIngredientList>(
    `/meals/${mealId}/ingredient-catalog/${suffix}`
  );
};

export const createMealCatalogIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  input: IngredientRequest
) =>
  request<Ingredient>(`/meals/${mealId}/ingredient-catalog/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateIngredient = (
  request: AuthenticatedRequest,
  ingredientId: number,
  input: PatchedIngredientRequest
) =>
  request<Ingredient>(`/ingredients/${ingredientId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getMealIngredients = (request: AuthenticatedRequest, mealId: number) =>
  request<PaginatedMealIngredientList>(`/meals/${mealId}/ingredients/`);

export const getMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  mealIngredientId: number
) => request<MealIngredient>(`/meals/${mealId}/ingredients/${mealIngredientId}/`);

export const createMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  input: MealIngredientRequest
) =>
  request<MealIngredient>(`/meals/${mealId}/ingredients/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMealIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  mealIngredientId: number,
  input: PatchedMealIngredientRequest
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
  request<PaginatedTagList>(`/tags/${getCatalogSuffix(search)}`);

export const createTag = (request: AuthenticatedRequest, name: string) =>
  request<Tag>("/tags/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const getMealTagCatalog = (
  request: AuthenticatedRequest,
  mealId: number,
  search = ""
) =>
  request<PaginatedTagList>(`/meals/${mealId}/tag-catalog/${getCatalogSuffix(search)}`);

export const createMealCatalogTag = (
  request: AuthenticatedRequest,
  mealId: number,
  name: string
) =>
  request<Tag>(`/meals/${mealId}/tag-catalog/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const getMealTagFilterOptions = (request: AuthenticatedRequest, search = "") =>
  request<MealTagFilterOption[]>(`/meal-tags/${getCatalogSuffix(search)}`);
