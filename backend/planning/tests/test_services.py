from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts.models import User
from meals.models import Ingredient, Meal, MealIngredient
from planning.models import Plan, PlanItem
from planning.services import (
    build_meal_snapshot,
    create_plan_item,
    get_or_create_personal_plan,
)


class PlanningServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.user)
        self.meal = Meal.objects.create(
            owner=self.user,
            name="Vegetable soup",
            source=Meal.Source.HOME,
            tags=["warm", "quick"],
        )
        self.ingredient = Ingredient.objects.create(owner=self.user, name="Carrot")
        self.meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

    def test_get_or_create_personal_plan_reuses_existing_plan(self):
        first = get_or_create_personal_plan(self.user)
        second = get_or_create_personal_plan(self.user)

        self.assertEqual(first, self.plan)
        self.assertEqual(second, self.plan)
        self.assertEqual(Plan.objects.filter(owner=self.user).count(), 1)

    def test_build_meal_snapshot_captures_shopping_data(self):
        snapshot = build_meal_snapshot(self.meal)

        self.assertEqual(
            snapshot,
            {
                "meal_id": self.meal.id,
                "name": "Vegetable soup",
                "source": "home",
                "tags": ["warm", "quick"],
                "ingredients": [
                    {
                        "ingredient_id": self.ingredient.id,
                        "name": "Carrot",
                        "quantity": "2.00",
                        "unit": "piece",
                    }
                ],
            },
        )

    def test_create_plan_item_stores_snapshot_and_planning_fields(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
            servings=3,
            note="Cook in advance",
        )

        self.assertEqual(item.plan, self.plan)
        self.assertEqual(item.date, date(2026, 11, 2))
        self.assertEqual(item.meal_type, PlanItem.MealType.DINNER)
        self.assertEqual(item.servings, 3)
        self.assertEqual(item.note, "Cook in advance")
        self.assertEqual(item.meal_snapshot, build_meal_snapshot(self.meal))

    def test_stored_snapshot_does_not_change_with_meal(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        original_snapshot = item.meal_snapshot

        self.meal.name = "Updated soup"
        self.meal.tags.append("new")
        self.meal.save(update_fields=("name", "tags"))
        self.meal_ingredient.quantity = Decimal("5.00")
        self.meal_ingredient.save(update_fields=("quantity",))
        item.refresh_from_db()

        self.assertEqual(item.meal_snapshot, original_snapshot)

    def test_create_plan_item_rejects_unavailable_meal_atomically(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        other_meal = Meal.objects.create(owner=other_user, name="Private meal")

        with self.assertRaises(ValidationError):
            create_plan_item(
                plan=self.plan,
                meal=other_meal,
                scheduled_date=date(2026, 11, 2),
                meal_type=PlanItem.MealType.LUNCH,
            )

        self.assertFalse(PlanItem.objects.exists())
