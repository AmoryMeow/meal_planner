from decimal import Decimal

from django.test import TestCase

from accounts.models import User
from meals.models import Ingredient, Meal
from meals.serializers import IngredientSerializer, MealSerializer


class IngredientSerializerTests(TestCase):
    def test_serializes_ingredient(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        meal = Meal.objects.create(owner=owner, name="Vegetable soup")
        ingredient = Ingredient.objects.create(
            meal=meal,
            name="Carrot",
            quantity=Decimal("2.00"),
            unit="piece",
        )

        data = IngredientSerializer(ingredient).data

        self.assertEqual(
            data,
            {
                "id": ingredient.id,
                "name": "Carrot",
                "quantity": "2.00",
                "unit": "piece",
            },
        )

    def test_rejects_non_positive_quantity(self):
        serializer = IngredientSerializer(
            data={"name": "Carrot", "quantity": "0.00", "unit": "piece"}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("quantity", serializer.errors)


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
        ingredient = Ingredient.objects.create(
            meal=meal,
            name="Carrot",
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
                    "id": ingredient.id,
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
                    {"name": "Carrot", "quantity": "2.00", "unit": "piece"}
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("ingredients", serializer.validated_data)
