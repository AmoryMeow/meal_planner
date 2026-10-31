from decimal import Decimal
from types import SimpleNamespace

from django.test import TestCase

from accounts.models import User
from meals.models import Ingredient, Meal, MealIngredient
from meals.serializers import (
    IngredientSerializer,
    MealIngredientSerializer,
    MealSerializer,
)


class IngredientSerializerTests(TestCase):
    def test_serializes_catalog_ingredient(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        ingredient = Ingredient.objects.create(owner=owner, name="Carrot")

        data = IngredientSerializer(ingredient).data

        self.assertEqual(data["id"], ingredient.id)
        self.assertEqual(data["name"], "Carrot")
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)


class MealIngredientSerializerTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_owner = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.ingredient = Ingredient.objects.create(
            owner=self.owner,
            name="Carrot",
        )

    def test_serializes_meal_ingredient(self):
        meal = Meal.objects.create(owner=self.owner, name="Vegetable soup")
        meal_ingredient = MealIngredient.objects.create(
            meal=meal,
            ingredient=self.ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

        data = MealIngredientSerializer(meal_ingredient).data

        self.assertEqual(
            data,
            {
                "id": meal_ingredient.id,
                "ingredient_id": self.ingredient.id,
                "name": "Carrot",
                "quantity": "2.00",
                "unit": "piece",
            },
        )

    def test_rejects_non_positive_quantity(self):
        serializer = MealIngredientSerializer(
            data={
                "ingredient_id": self.ingredient.id,
                "quantity": "0.00",
                "unit": "piece",
            },
            context={"request": SimpleNamespace(user=self.owner)},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("quantity", serializer.errors)

    def test_rejects_another_users_catalog_ingredient(self):
        ingredient = Ingredient.objects.create(
            owner=self.other_owner,
            name="Private ingredient",
        )
        serializer = MealIngredientSerializer(
            data={
                "ingredient_id": ingredient.id,
                "quantity": "1.00",
                "unit": "piece",
            },
            context={"request": SimpleNamespace(user=self.owner)},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("ingredient_id", serializer.errors)


class MealSerializerTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )

    def test_serializes_meal_with_ingredients(self):
        meal = Meal.objects.create(
            owner=self.owner,
            name="Vegetable soup",
            tags=["vegetarian", "soup"],
        )
        ingredient = Ingredient.objects.create(owner=self.owner, name="Carrot")
        meal_ingredient = MealIngredient.objects.create(
            meal=meal,
            ingredient=ingredient,
            quantity=Decimal("2.00"),
            unit="piece",
        )

        data = MealSerializer(meal).data

        self.assertEqual(data["id"], meal.id)
        self.assertEqual(data["name"], "Vegetable soup")
        self.assertEqual(data["source"], Meal.Source.HOME)
        self.assertEqual(data["tags"], ["vegetarian", "soup"])
        self.assertEqual(
            data["ingredients"],
            [
                {
                    "id": meal_ingredient.id,
                    "ingredient_id": ingredient.id,
                    "name": "Carrot",
                    "quantity": "2.00",
                    "unit": "piece",
                }
            ],
        )
        self.assertNotIn("owner", data)

    def test_accepts_meal_without_ingredients_or_tags(self):
        serializer = MealSerializer(
            data={"name": "Pizza", "source": Meal.Source.DELIVERY}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["tags"], [])

    def test_rejects_unknown_source(self):
        serializer = MealSerializer(data={"name": "Pizza", "source": "unknown"})

        self.assertFalse(serializer.is_valid())
        self.assertIn("source", serializer.errors)

    def test_rejects_tags_that_are_not_a_list(self):
        serializer = MealSerializer(data={"name": "Pizza", "tags": "fast-food"})

        self.assertFalse(serializer.is_valid())
        self.assertIn("tags", serializer.errors)

    def test_ingredients_are_read_only(self):
        serializer = MealSerializer(
            data={
                "name": "Vegetable soup",
                "ingredients": [
                    {"ingredient_id": 1, "quantity": "2.00", "unit": "piece"}
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("ingredients", serializer.validated_data)
