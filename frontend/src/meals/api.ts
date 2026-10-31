import type { AuthenticatedRequest } from "@package/auth";

export type MealSource = "home" | "restaurant" | "delivery";

export type Ingredient = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
};

export type CreateIngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

export type Meal = {
  id: number;
  name: string;
  source: MealSource;
  tags: string[];
  ingredients: Ingredient[];
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

export const getIngredients = (request: AuthenticatedRequest, mealId: number) =>
  request<PaginatedResponse<Ingredient>>(`/meals/${mealId}/ingredients/`);

export const getIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  ingredientId: number
) => request<Ingredient>(`/meals/${mealId}/ingredients/${ingredientId}/`);

export const createIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  input: CreateIngredientInput
) =>
  request<Ingredient>(`/meals/${mealId}/ingredients/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  ingredientId: number,
  input: UpdateIngredientInput
) =>
  request<Ingredient>(`/meals/${mealId}/ingredients/${ingredientId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteIngredient = (
  request: AuthenticatedRequest,
  mealId: number,
  ingredientId: number
) =>
  request<void>(`/meals/${mealId}/ingredients/${ingredientId}/`, {
    method: "DELETE",
  });
