from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import RestrictedError
from django.test import TestCase

from accounts.models import User
from meals.models import Ingredient, Meal, MealIngredient


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
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )

    def test_ingredient_name_is_normalized_per_owner(self):
        ingredient = Ingredient.objects.create(
            owner=self.user,
            name="  Green   Onion  ",
        )

        self.assertEqual(ingredient.name, "Green Onion")
        self.assertEqual(ingredient.normalized_name, "green onion")
        self.assertQuerySetEqual(self.user.ingredients.all(), [ingredient])

    def test_owner_cannot_have_duplicate_normalized_ingredient_names(self):
        Ingredient.objects.create(owner=self.user, name="Carrot")

        with self.assertRaises(IntegrityError), transaction.atomic():
            Ingredient.objects.create(owner=self.user, name="  CARROT ")

    def test_updating_name_updates_normalized_name(self):
        ingredient = Ingredient.objects.create(owner=self.user, name="Green onion")

        ingredient.name = "  SPRING   Onion "
        ingredient.save(update_fields=("name",))
        ingredient.refresh_from_db()

        self.assertEqual(ingredient.name, "SPRING Onion")
        self.assertEqual(ingredient.normalized_name, "spring onion")

    def test_different_owners_can_use_the_same_ingredient_name(self):
        first = Ingredient.objects.create(owner=self.user, name="Carrot")
        second = Ingredient.objects.create(owner=self.other_user, name="Carrot")

        self.assertNotEqual(first.owner, second.owner)

    def test_string_representation_is_ingredient_name(self):
        ingredient = Ingredient(owner=self.user, name="Carrot")

        self.assertEqual(str(ingredient), "Carrot")


class MealIngredientModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.ingredient = Ingredient.objects.create(owner=self.user, name="Carrot")
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")

    def test_meal_can_have_no_ingredients(self):
        self.assertFalse(self.meal.ingredients.exists())

    def test_catalog_ingredient_can_be_used_in_multiple_meals(self):
        second_meal = Meal.objects.create(owner=self.user, name="Salad")
        soup_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )
        salad_ingredient = MealIngredient.objects.create(
            meal=second_meal,
            ingredient=self.ingredient,
            quantity=Decimal("1.00"),
            unit="piece",
        )

        self.assertQuerySetEqual(self.meal.ingredients.all(), [soup_ingredient])
        self.assertQuerySetEqual(second_meal.ingredients.all(), [salad_ingredient])
        self.assertQuerySetEqual(
            self.ingredient.meal_ingredients.order_by("id"),
            [soup_ingredient, salad_ingredient],
        )

    def test_meal_ingredient_accepts_fractional_quantity(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("0.25"),
            unit="kg",
        )

        meal_ingredient.refresh_from_db()

        self.assertEqual(meal_ingredient.quantity, Decimal("0.25"))

    def test_meal_ingredient_rejects_non_positive_quantity_during_validation(self):
        for quantity in (Decimal("0"), Decimal("-1")):
            with self.subTest(quantity=quantity):
                meal_ingredient = MealIngredient(
                    meal=self.meal,
                    ingredient=self.ingredient,
                    quantity=quantity,
                    unit="piece",
                )

                with self.assertRaises(ValidationError):
                    meal_ingredient.full_clean()

    def test_database_rejects_non_positive_quantity(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            MealIngredient.objects.create(
                meal=self.meal,
                ingredient=self.ingredient,
                quantity=Decimal("0"),
                unit="piece",
            )

    def test_string_representation_contains_ingredient_and_meal_names(self):
        meal_ingredient = MealIngredient(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

        self.assertEqual(str(meal_ingredient), "Carrot — Vegetable soup")

    def test_deleting_meal_deletes_associations_but_keeps_catalog_ingredient(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

        self.meal.delete()

        self.assertFalse(MealIngredient.objects.filter(pk=meal_ingredient.pk).exists())
        self.assertTrue(Ingredient.objects.filter(pk=self.ingredient.pk).exists())

    def test_ingredient_in_use_cannot_be_deleted(self):
        MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

        with self.assertRaises(RestrictedError):
            self.ingredient.delete()

    def test_meal_ingredient_rejects_ingredient_from_another_owner(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        other_ingredient = Ingredient.objects.create(
            owner=other_user,
            name="Private ingredient",
        )
        meal_ingredient = MealIngredient(
            meal=self.meal,
            ingredient=other_ingredient,
            quantity=Decimal("1.00"),
            unit="piece",
        )

        with self.assertRaises(ValidationError):
            meal_ingredient.full_clean()
