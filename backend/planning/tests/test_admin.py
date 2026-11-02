from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from meals.models import Meal
from planning.models import Plan, PlanItem


class PlanningAdminTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="A-secure-password-123",
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.owner)
        self.meal = Meal.objects.create(owner=self.owner, name="Vegetable soup")
        self.plan_item = PlanItem.objects.create(
            plan=self.plan,
            meal=self.meal,
            date="2026-11-02",
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_login(self.admin_user)

    def test_planning_models_are_registered(self):
        self.assertTrue(admin.site.is_registered(Plan))
        self.assertTrue(admin.site.is_registered(PlanItem))

    def test_plan_admin_lists_plans(self):
        response = self.client.get(reverse("admin:planning_plan_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.plan.name)
        self.assertContains(response, self.owner.email)

    def test_plan_item_admin_lists_scheduled_meals(self):
        response = self.client.get(reverse("admin:planning_planitem_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.meal.name)
        self.assertContains(response, self.plan.name)
