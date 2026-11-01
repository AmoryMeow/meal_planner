from datetime import date

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from accounts.models import User
from meals.models import Meal
from planning.models import Plan, PlanItem


class PlanModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )

    def test_user_has_one_personal_plan(self):
        plan = Plan.objects.create(owner=self.user)

        self.assertEqual(self.user.personal_plan, plan)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Plan.objects.create(owner=self.user)

    def test_deleting_owner_deletes_personal_plan(self):
        plan = Plan.objects.create(owner=self.user)

        self.user.delete()

        self.assertFalse(Plan.objects.filter(pk=plan.pk).exists())


class PlanItemModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.user)
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

    def create_plan_item(self, **overrides):
        values = {
            "plan": self.plan,
            "date": date(2026, 11, 1),
            "meal_type": PlanItem.MealType.LUNCH,
            "meal": self.meal,
        }
        values.update(overrides)
        return PlanItem.objects.create(**values)

    def test_plan_item_uses_personal_defaults(self):
        item = self.create_plan_item()

        self.assertEqual(item.servings, 1)
        self.assertEqual(item.note, "")
        self.assertEqual(item.meal_snapshot, {})
        self.assertIsNotNone(item.created_at)
        self.assertIsNotNone(item.updated_at)

    def test_plan_supports_multiple_meals_in_the_same_slot(self):
        second_meal = Meal.objects.create(owner=self.user, name="Salad")
        first_item = self.create_plan_item()
        second_item = self.create_plan_item(meal=second_meal)

        self.assertQuerySetEqual(self.plan.items.all(), [first_item, second_item])

    def test_plan_item_accepts_supported_meal_types(self):
        for meal_type in PlanItem.MealType.values:
            with self.subTest(meal_type=meal_type):
                item = PlanItem(
                    plan=self.plan,
                    date=date(2026, 11, 1),
                    meal_type=meal_type,
                    meal=self.meal,
                )
                item.full_clean()

    def test_plan_item_rejects_unsupported_meal_type(self):
        item = PlanItem(
            plan=self.plan,
            date=date(2026, 11, 1),
            meal_type="snack",
            meal=self.meal,
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_plan_item_requires_at_least_one_serving(self):
        item = PlanItem(
            plan=self.plan,
            date=date(2026, 11, 1),
            meal_type=PlanItem.MealType.DINNER,
            meal=self.meal,
            servings=0,
        )

        with self.assertRaises(ValidationError):
            item.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_plan_item(servings=0)

    def test_plan_item_rejects_meal_owned_by_another_user(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        other_meal = Meal.objects.create(owner=other_user, name="Private meal")
        item = PlanItem(
            plan=self.plan,
            date=date(2026, 11, 1),
            meal_type=PlanItem.MealType.DINNER,
            meal=other_meal,
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_meal_in_use_cannot_be_deleted(self):
        self.create_plan_item()

        with self.assertRaises(ProtectedError):
            self.meal.delete()

    def test_snapshot_remains_unchanged_when_meal_changes(self):
        snapshot = {
            "name": self.meal.name,
            "source": self.meal.source,
            "ingredients": [],
        }
        item = self.create_plan_item(meal_snapshot=snapshot)

        self.meal.name = "Updated soup"
        self.meal.save(update_fields=("name",))
        item.refresh_from_db()

        self.assertEqual(item.meal_snapshot, snapshot)
