from datetime import date

from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from meals.models import Meal
from planning.models import Plan, PlanItem
from planning.services import create_plan_item


class PlanItemApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(owner=self.user)
        self.other_plan = Plan.objects.create(owner=self.other_user)
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        self.other_meal = Meal.objects.create(
            owner=self.other_user,
            name="Private meal",
        )
        self.url = reverse("plan-item-list")

    def test_list_requires_authentication(self):
        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_requires_valid_date_range(self):
        self.client.force_authenticate(user=self.user)

        missing_range = self.client.get(self.url)
        reversed_range = self.client.get(
            self.url,
            {"date_from": "2026-11-07", "date_to": "2026-11-01"},
        )

        self.assertEqual(missing_range.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_from", missing_range.data)
        self.assertIn("date_to", missing_range.data)
        self.assertEqual(reversed_range.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", reversed_range.data)

    def test_list_contains_only_current_plan_and_requested_dates(self):
        breakfast = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.BREAKFAST,
        )
        dinner = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
        )
        create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 12, 1),
            meal_type=PlanItem.MealType.LUNCH,
        )
        create_plan_item(
            plan=self.other_plan,
            meal=self.other_meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data],
            [breakfast.id, dinner.id],
        )

    def test_empty_list_does_not_create_personal_plan(self):
        user_without_plan = User.objects.create_user(
            email="without-plan@example.com",
            password="A-secure-password-123",
        )
        self.client.force_authenticate(user=user_without_plan)

        response = self.client.get(
            self.url,
            {"date_from": "2026-11-01", "date_to": "2026-11-07"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
        self.assertFalse(Plan.objects.filter(owner=user_without_plan).exists())

    def test_create_assigns_personal_plan_and_builds_snapshot(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            {
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.meal.id,
                "servings": 2,
                "note": "Prepare early",
                "plan_id": self.other_plan.id,
                "meal_snapshot": {"name": "Spoofed meal"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PlanItem.objects.get(pk=response.data["id"])
        self.assertEqual(item.plan, self.plan)
        self.assertEqual(item.meal_snapshot["name"], "Vegetable soup")

    def test_create_initializes_personal_plan_when_missing(self):
        user_without_plan = User.objects.create_user(
            email="without-plan@example.com",
            password="A-secure-password-123",
        )
        meal = Meal.objects.create(owner=user_without_plan, name="New meal")
        self.client.force_authenticate(user=user_without_plan)

        response = self.client.post(
            self.url,
            {
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": meal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["plan_id"],
            Plan.objects.get(owner=user_without_plan).id,
        )

    def test_create_rejects_another_users_meal(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            {
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.other_meal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("meal_id", response.data)

    def test_detail_requires_authentication(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )

        response = self.client.get(reverse("plan-item-detail", args=(item.id,)))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detail_is_available_only_to_plan_owner(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        url = reverse("plan-item-detail", args=(item.id,))

        self.client.force_authenticate(user=self.user)
        owner_response = self.client.get(url)
        self.client.force_authenticate(user=self.other_user)
        other_response = self.client.get(url)

        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_response.data["id"], item.id)
        self.assertEqual(other_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_updates_plan_item_without_replacing_snapshot(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        original_snapshot = item.meal_snapshot.copy()
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("plan-item-detail", args=(item.id,)),
            {
                "date": "2026-11-03",
                "meal_type": "dinner",
                "servings": 3,
                "note": "Invite friends",
                "plan_id": self.other_plan.id,
                "meal_snapshot": {"name": "Spoofed meal"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.plan, self.plan)
        self.assertEqual(item.date, date(2026, 11, 3))
        self.assertEqual(item.meal_type, PlanItem.MealType.DINNER)
        self.assertEqual(item.servings, 3)
        self.assertEqual(item.note, "Invite friends")
        self.assertEqual(item.meal_snapshot, original_snapshot)

    def test_patch_replaces_snapshot_when_meal_changes(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        replacement = Meal.objects.create(owner=self.user, name="Pasta")
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("plan-item-detail", args=(item.id,)),
            {"meal_id": replacement.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.meal, replacement)
        self.assertEqual(item.meal_snapshot["name"], "Pasta")

    def test_patch_rejects_another_users_meal(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("plan-item-detail", args=(item.id,)),
            {"meal_id": self.other_meal.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("meal_id", response.data)
