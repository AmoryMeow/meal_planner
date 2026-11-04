from types import SimpleNamespace

from django.test import SimpleTestCase

from shopping.services import build_shopping_list


class ShoppingListServiceTests(SimpleTestCase):
    def make_item(self, *, servings, recipe_servings=1, ingredients=None):
        meal_ingredients = [
            SimpleNamespace(
                ingredient=SimpleNamespace(name=ingredient["name"]),
                quantity=ingredient["quantity"],
                unit=ingredient["unit"],
            )
            for ingredient in ingredients or []
        ]
        return SimpleNamespace(
            servings=servings,
            meal=SimpleNamespace(
                servings=recipe_servings,
                ingredients=SimpleNamespace(all=lambda: meal_ingredients),
            ),
            meal_snapshot={},
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

    def test_uses_current_recipe_instead_of_stale_snapshot(self):
        item = self.make_item(
            servings=3,
            ingredients=[{"name": "Rice", "quantity": "0.50", "unit": "kg"}],
        )
        item.meal_snapshot = {
            "ingredients": [{"name": "Sugar", "quantity": "5.00", "unit": "kg"}]
        }

        result = build_shopping_list([item])

        self.assertEqual(
            result,
            [{"name": "Rice", "quantity": "1.50", "unit": "kg"}],
        )
