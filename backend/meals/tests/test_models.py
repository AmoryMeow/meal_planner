from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from accounts.models import User
from meals.models import Ingredient, Meal


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


class IngredientModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

    def test_meal_can_have_no_ingredients(self):
        self.assertFalse(self.meal.ingredients.exists())

    def test_ingredient_belongs_to_meal(self):
        ingredient = Ingredient.objects.create(
            meal=self.meal,
            name="Carrot",
            quantity=Decimal("2.00"),
            unit="piece",
        )

        self.assertQuerySetEqual(self.meal.ingredients.all(), [ingredient])
        self.assertEqual(ingredient.quantity, Decimal("2.00"))
        self.assertEqual(ingredient.unit, "piece")

    def test_ingredient_accepts_fractional_quantity(self):
        ingredient = Ingredient.objects.create(
            meal=self.meal,
            name="Olive oil",
            quantity=Decimal("0.25"),
            unit="l",
        )

        ingredient.refresh_from_db()

        self.assertEqual(ingredient.quantity, Decimal("0.25"))

    def test_ingredient_rejects_non_positive_quantity_during_validation(self):
        for quantity in (Decimal("0"), Decimal("-1")):
            with self.subTest(quantity=quantity):
                ingredient = Ingredient(
                    meal=self.meal,
                    name="Carrot",
                    quantity=quantity,
                    unit="piece",
                )

                with self.assertRaises(ValidationError):
                    ingredient.full_clean()

    def test_database_rejects_non_positive_quantity(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Ingredient.objects.create(
                meal=self.meal,
                name="Carrot",
                quantity=Decimal("0"),
                unit="piece",
            )

    def test_string_representation_is_ingredient_name(self):
        ingredient = Ingredient(
            meal=self.meal,
            name="Carrot",
            quantity=Decimal("2.00"),
            unit="piece",
        )

        self.assertEqual(str(ingredient), "Carrot")

    def test_deleting_meal_deletes_ingredients(self):
        ingredient = Ingredient.objects.create(
            meal=self.meal,
            name="Carrot",
            quantity=Decimal("2.00"),
            unit="piece",
        )

        self.meal.delete()

        self.assertFalse(Ingredient.objects.filter(pk=ingredient.pk).exists())
