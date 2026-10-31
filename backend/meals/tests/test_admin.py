from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from meals.models import Ingredient, Meal, MealIngredient


class MealsAdminTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="A-secure-password-123",
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.meal = Meal.objects.create(owner=self.owner, name="Vegetable soup")
        self.ingredient = Ingredient.objects.create(owner=self.owner, name="Carrot")
        self.meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        self.client.force_login(self.admin_user)

    def test_meal_and_ingredient_models_are_registered(self):
        self.assertTrue(admin.site.is_registered(Meal))
        self.assertTrue(admin.site.is_registered(Ingredient))
        self.assertTrue(admin.site.is_registered(MealIngredient))

    def test_meal_admin_lists_meals(self):
        response = self.client.get(reverse("admin:meals_meal_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.meal.name)
        self.assertContains(response, self.owner.email)

    def test_meal_admin_displays_ingredients_inline(self):
        response = self.client.get(
            reverse("admin:meals_meal_change", args=[self.meal.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.ingredient.name)

    def test_ingredient_admin_lists_ingredients(self):
        response = self.client.get(reverse("admin:meals_ingredient_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.ingredient.name)

    def test_meal_ingredient_admin_lists_associations(self):
        response = self.client.get(reverse("admin:meals_mealingredient_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.ingredient.name)
        self.assertContains(response, self.meal.name)
