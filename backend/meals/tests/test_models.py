from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts.models import User
from meals.models import Meal


class MealModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )

    def test_meal_uses_personal_defaults(self):
        meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

        self.assertEqual(meal.source, Meal.Source.HOME)
        self.assertEqual(meal.tags, [])
        self.assertIsNotNone(meal.created_at)
        self.assertIsNotNone(meal.updated_at)

    def test_meal_accepts_supported_sources(self):
        for source in Meal.Source.values:
            with self.subTest(source=source):
                meal = Meal(owner=self.user, name="Test meal", source=source)
                meal.full_clean()

    def test_meal_rejects_unsupported_source(self):
        meal = Meal(owner=self.user, name="Test meal", source="unknown")

        with self.assertRaises(ValidationError):
            meal.full_clean()

    def test_meals_have_independent_tag_lists(self):
        first_meal = Meal.objects.create(owner=self.user, name="First meal")
        second_meal = Meal.objects.create(owner=self.user, name="Second meal")

        first_meal.tags.append("quick")
        first_meal.save(update_fields=["tags"])
        second_meal.refresh_from_db()

        self.assertEqual(first_meal.tags, ["quick"])
        self.assertEqual(second_meal.tags, [])

    def test_user_exposes_owned_meals(self):
        meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

        self.assertQuerySetEqual(self.user.meals.all(), [meal])

    def test_string_representation_is_meal_name(self):
        meal = Meal(owner=self.user, name="Vegetable soup")

        self.assertEqual(str(meal), "Vegetable soup")

    def test_deleting_user_deletes_owned_meals(self):
        meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

        self.user.delete()

        self.assertFalse(Meal.objects.filter(pk=meal.pk).exists())
