from datetime import date
from decimal import Decimal

from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.services import create_group
from meals.models import Ingredient, Meal, MealIngredient
from planning.models import Plan, PlanItem
from planning.services import create_plan_item


class ShoppingListApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.user)
        self.other_plan = Plan.objects.create(owner=self.other_user)
        self.meal = Meal.objects.create(
            owner=self.user,
            name="Vegetable soup",
            servings=4,
        )
        ingredient = Ingredient.objects.create(owner=self.user, name="Carrot")
        MealIngredient.objects.create(
            meal=self.meal,
            ingredient=ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )
        self.url = reverse("shopping-list")

    def test_requires_authentication(self):
        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_requires_valid_date_range(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {"date_from": "2026-11-07", "date_to": "2026-11-01"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

    def test_calculates_list_from_personal_plan_snapshots(self):
        create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
            servings=6,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [{"name": "Carrot", "quantity": "3.00", "unit": "piece"}],
        )

    def test_uses_only_requested_dates(self):
        create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 12, 1),
            meal_type=PlanItem.MealType.DINNER,
            servings=6,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_calculates_list_from_selected_accessible_plan(self):
        group = create_group(owner=self.user, name="Family")
        create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
            servings=4,
        )
        create_plan_item(
            plan=group.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
            servings=2,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-11-01",
                "date_to": "2026-11-07",
                "plan_ids": str(group.plan.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [{"name": "Carrot", "quantity": "1.00", "unit": "piece"}],
        )

    def test_ignores_inaccessible_requested_plans(self):
        other_meal = Meal.objects.create(
            owner=self.other_user,
            name="Private meal",
        )
        other_ingredient = Ingredient.objects.create(
            owner=self.other_user,
            name="Secret ingredient",
        )
        MealIngredient.objects.create(
            meal=other_meal,
            ingredient=other_ingredient,
            quantity=Decimal("1.00"),
            unit="piece",
        )
        create_plan_item(
            plan=self.other_plan,
            meal=other_meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-11-01",
                "date_to": "2026-11-07",
                "plan_ids": str(self.other_plan.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
