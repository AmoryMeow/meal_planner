from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class SplitIngredientCatalogMigrationTests(TransactionTestCase):
    migrate_from = [
        ("accounts", "0002_alter_user_managers_remove_user_username"),
        ("meals", "0002_ingredient_and_more"),
    ]
    migrate_to = [
        ("accounts", "0002_alter_user_managers_remove_user_username"),
        ("meals", "0003_split_ingredient_catalog"),
    ]

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.migrate_from)
        old_apps = self.executor.loader.project_state(self.migrate_from).apps

        User = old_apps.get_model("accounts", "User")
        Meal = old_apps.get_model("meals", "Meal")
        Ingredient = old_apps.get_model("meals", "Ingredient")

        owner = User.objects.create(email="owner@example.com")
        soup = Meal.objects.create(owner=owner, name="Vegetable soup")
        salad = Meal.objects.create(owner=owner, name="Salad")
        Ingredient.objects.create(
            meal=soup,
            name="  Carrot ",
            quantity="2.00",
            unit="piece",
        )
        Ingredient.objects.create(
            meal=salad,
            name="CARROT",
            quantity="1.00",
            unit="piece",
        )

        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.migrate_to)
        self.apps = self.executor.loader.project_state(self.migrate_to).apps

    def tearDown(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_migration_reuses_normalized_catalog_ingredient(self):
        Ingredient = self.apps.get_model("meals", "Ingredient")
        MealIngredient = self.apps.get_model("meals", "MealIngredient")

        catalog_ingredient = Ingredient.objects.get()
        meal_ingredients = MealIngredient.objects.order_by("id")

        self.assertEqual(catalog_ingredient.name, "Carrot")
        self.assertEqual(catalog_ingredient.normalized_name, "carrot")
        self.assertEqual(meal_ingredients.count(), 2)
        self.assertTrue(
            all(
                item.ingredient_id == catalog_ingredient.id for item in meal_ingredients
            )
        )
        self.assertEqual(
            list(meal_ingredients.values_list("quantity", flat=True)),
            [2, 1],
        )

    def test_migration_is_reversible(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.migrate_from)
        old_apps = self.executor.loader.project_state(self.migrate_from).apps
        Ingredient = old_apps.get_model("meals", "Ingredient")

        self.assertEqual(Ingredient.objects.count(), 2)
        self.assertEqual(
            list(Ingredient.objects.order_by("id").values_list("name", flat=True)),
            ["Carrot", "Carrot"],
        )
