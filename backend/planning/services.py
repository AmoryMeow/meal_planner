from datetime import date

from django.db import transaction

from meals.models import Meal

from .models import Plan, PlanItem


def get_or_create_personal_plan(user):
    plan, _ = Plan.objects.get_or_create(owner=user)
    return plan


def build_meal_snapshot(meal: Meal) -> dict:
    return {
        "meal_id": meal.id,
        "name": meal.name,
        "source": meal.source,
        "servings": meal.servings,
        "instructions": meal.instructions,
        "tags": list(meal.tags.order_by("name", "id").values_list("name", flat=True)),
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
