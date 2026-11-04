from types import SimpleNamespace

from django.test import SimpleTestCase

from shopping.services import build_shopping_list


class ShoppingListServiceTests(SimpleTestCase):
    def make_item(self, *, servings, recipe_servings=1, ingredients=None):
        return SimpleNamespace(
            servings=servings,
            meal_snapshot={
                "servings": recipe_servings,
                "ingredients": ingredients or [],
            },
        )

    def test_scales_ingredient_quantity_by_planned_servings(self):
        item = self.make_item(
            servings=6,
            recipe_servings=4,
            ingredients=[{"name": "Carrot", "quantity": "2.00", "unit": "piece"}],
        )

        result = build_shopping_list([item])

        self.assertEqual(
            result,
            [{"name": "Carrot", "quantity": "3.00", "unit": "piece"}],
        )

    def test_merges_matching_ingredients_case_insensitively(self):
        first = self.make_item(
            servings=1,
            ingredients=[{"name": " Carrot ", "quantity": "1.00", "unit": "Piece"}],
        )
        second = self.make_item(
            servings=1,
            ingredients=[{"name": "carrot", "quantity": "2.00", "unit": "piece"}],
        )

        result = build_shopping_list([first, second])

        self.assertEqual(
            result,
            [{"name": "Carrot", "quantity": "3.00", "unit": "Piece"}],
        )

    def test_keeps_different_units_separate(self):
        item = self.make_item(
            servings=1,
            ingredients=[
                {"name": "Tomato", "quantity": "1.00", "unit": "kg"},
                {"name": "Tomato", "quantity": "2.00", "unit": "piece"},
            ],
        )

        result = build_shopping_list([item])

        self.assertEqual(
            result,
            [
                {"name": "Tomato", "quantity": "1.00", "unit": "kg"},
                {"name": "Tomato", "quantity": "2.00", "unit": "piece"},
            ],
        )

    def test_old_snapshot_without_recipe_servings_uses_one_serving(self):
        item = SimpleNamespace(
            servings=3,
            meal_snapshot={
                "ingredients": [{"name": "Rice", "quantity": "0.50", "unit": "kg"}]
            },
        )

        result = build_shopping_list([item])

        self.assertEqual(
            result,
            [{"name": "Rice", "quantity": "1.50", "unit": "kg"}],
        )
