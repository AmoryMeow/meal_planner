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
  tags: string[];
  ingredients: MealIngredient[];
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
  tags?: string[];
};

export type UpdateMealInput = Partial<CreateMealInput>;

export const getMeals = (request: AuthenticatedRequest) =>
  request<PaginatedResponse<Meal>>("/meals/");

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
