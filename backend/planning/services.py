from copy import deepcopy
from datetime import date

from django.db import transaction

from meals.models import Meal

from .models import Plan, PlanItem


def get_or_create_personal_plan(user):
    plan, _ = Plan.objects.get_or_create(owner=user)
    return plan


def build_meal_snapshot(meal: Meal) -> dict:
    ingredients = meal.ingredients.select_related("ingredient").order_by("id")

    return {
        "meal_id": meal.id,
        "name": meal.name,
        "source": meal.source,
        "tags": deepcopy(meal.tags),
        "ingredients": [
            {
                "ingredient_id": meal_ingredient.ingredient_id,
                "name": meal_ingredient.ingredient.name,
                "quantity": str(meal_ingredient.quantity),
                "unit": meal_ingredient.unit,
            }
            for meal_ingredient in ingredients
        ],
    }


@transaction.atomic
def create_plan_item(
    *,
    plan: Plan,
    meal: Meal,
    scheduled_date: date,
    meal_type: str,
    servings: int = 1,
    note: str = "",
) -> PlanItem:
    item = PlanItem(
        plan=plan,
        date=scheduled_date,
        meal_type=meal_type,
        meal=meal,
        servings=servings,
        note=note,
        meal_snapshot=build_meal_snapshot(meal),
    )
    item.full_clean()
    item.save()
    return item
