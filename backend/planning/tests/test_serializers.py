from datetime import date

from django.test import TestCase

from rest_framework.test import APIRequestFactory

from accounts.models import User
from meals.models import Meal
from planning.models import Plan
from planning.serializers import PlanItemSerializer


class PlanItemSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.user)
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        self.request = APIRequestFactory().post("/api/plan-items/")
        self.request.user = self.user

    def get_serializer(self, *args, **kwargs):
        context = kwargs.setdefault("context", {})
        context["request"] = self.request
        return PlanItemSerializer(*args, **kwargs)

    def test_serializer_creates_item_through_snapshot_service(self):
        serializer = self.get_serializer(
            data={
                "date": "2026-11-02",
                "meal_type": "dinner",
                "meal_id": self.meal.id,
                "servings": 3,
                "note": "Cook in advance",
                "meal_snapshot": {"name": "Spoofed meal"},
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        item = serializer.save(plan=self.plan)

        self.assertEqual(item.date, date(2026, 11, 2))
        self.assertEqual(item.meal, self.meal)
        self.assertEqual(item.servings, 3)
        self.assertEqual(item.note, "Cook in advance")
        self.assertEqual(item.meal_snapshot["name"], "Vegetable soup")

    def test_serializer_representation_contains_calendar_data(self):
        serializer = self.get_serializer(
            data={
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.meal.id,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        item = serializer.save(plan=self.plan)

        data = PlanItemSerializer(item).data

        self.assertEqual(data["id"], item.id)
        self.assertEqual(data["plan_id"], self.plan.id)
        self.assertEqual(data["meal_id"], self.meal.id)
        self.assertEqual(data["meal_snapshot"]["name"], "Vegetable soup")

    def test_serializer_rejects_meal_owned_by_another_user(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        other_meal = Meal.objects.create(owner=other_user, name="Private meal")
        serializer = self.get_serializer(
            data={
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": other_meal.id,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("meal_id", serializer.errors)

    def test_serializer_validates_meal_type_and_servings(self):
        serializer = self.get_serializer(
            data={
                "date": "2026-11-02",
                "meal_type": "snack",
                "meal_id": self.meal.id,
                "servings": 0,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("meal_type", serializer.errors)
        self.assertIn("servings", serializer.errors)
