from datetime import date

from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Meal
from planning.models import Plan, PlanItem
from planning.services import create_plan_item


class PersonalPlanApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(
            owner=self.user,
            enabled_meal_types=[
                PlanItem.MealType.BREAKFAST,
                PlanItem.MealType.DINNER,
            ],
        )
        self.other_plan = Plan.objects.create(owner=self.other_user)
        self.url = reverse("personal-plan-detail")

    def test_plan_settings_require_authentication(self):
        get_response = self.client.get(self.url)
        patch_response = self.client.patch(
            self.url,
            {"enabled_meal_types": ["lunch"]},
            format="json",
        )

        self.assertEqual(get_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(patch_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_only_current_users_plan_settings(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.plan.id)
        self.assertEqual(
            response.data["enabled_meal_types"],
            [PlanItem.MealType.BREAKFAST, PlanItem.MealType.DINNER],
        )

    def test_get_initializes_missing_personal_plan_with_defaults(self):
        user_without_plan = User.objects.create_user(
            email="without-plan@example.com",
            password="A-secure-password-123",
        )
        self.client.force_authenticate(user=user_without_plan)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan = Plan.objects.get(owner=user_without_plan)
        self.assertEqual(response.data["id"], plan.id)
        self.assertEqual(
            response.data["enabled_meal_types"],
            list(PlanItem.MealType.values),
        )

    def test_patch_updates_only_current_users_plan_settings(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.url,
            {"enabled_meal_types": ["lunch"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.plan.refresh_from_db()
        self.other_plan.refresh_from_db()
        self.assertEqual(self.plan.enabled_meal_types, [PlanItem.MealType.LUNCH])
        self.assertEqual(
            self.other_plan.enabled_meal_types,
            list(PlanItem.MealType.values),
        )

    def test_patch_rejects_invalid_meal_sections(self):
        invalid_values = (
            [],
            ["breakfast", "snack"],
            ["lunch", "lunch"],
            "breakfast",
        )
        self.client.force_authenticate(user=self.user)

        for enabled_meal_types in invalid_values:
            with self.subTest(enabled_meal_types=enabled_meal_types):
                response = self.client.patch(
                    self.url,
                    {"enabled_meal_types": enabled_meal_types},
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("enabled_meal_types", response.data)


class PlanApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.plan = Plan.objects.create(
            owner=self.user,
            enabled_meal_types=[PlanItem.MealType.BREAKFAST],
        )
        self.other_plan = Plan.objects.create(owner=self.other_user)
        self.group = create_group(
            owner=self.user,
            name="Family",
            color="#A78BFA",
        )
        self.group_plan = self.group.plan
        self.list_url = reverse("plan-list")
        self.detail_url = reverse("plan-detail", args=(self.plan.id,))
        self.group_detail_url = reverse("plan-detail", args=(self.group_plan.id,))
        self.other_detail_url = reverse("plan-detail", args=(self.other_plan.id,))

    def test_plans_require_authentication(self):
        list_response = self.client.get(self.list_url)
        detail_response = self.client.get(self.detail_url)
        patch_response = self.client.patch(
            self.detail_url,
            {"enabled_meal_types": ["lunch"]},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(detail_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(patch_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_personal_and_group_plans(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [plan["id"] for plan in response.data],
            [self.plan.id, self.group_plan.id],
        )
        self.assertEqual(
            response.data[0],
            {
                "id": self.plan.id,
                "scope": "personal",
                "group_id": None,
                "can_manage": True,
                "name": self.plan.name,
                "color": self.plan.color,
                "enabled_meal_types": [PlanItem.MealType.BREAKFAST],
                "created_at": response.data[0]["created_at"],
                "updated_at": response.data[0]["updated_at"],
            },
        )
        self.assertEqual(response.data[1]["scope"], "group")
        self.assertEqual(response.data[1]["group_id"], self.group.id)
        self.assertTrue(response.data[1]["can_manage"])

    def test_list_returns_group_plan_to_member_without_management_access(self):
        member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        Membership.objects.create(
            group=self.group,
            user=member,
            role=Membership.Role.MEMBER,
        )
        self.client.force_authenticate(user=member)

        response = self.client.get(self.list_url)

        personal_plan = Plan.objects.get(owner=member)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [plan["id"] for plan in response.data],
            [personal_plan.id, self.group_plan.id],
        )
        self.assertFalse(response.data[1]["can_manage"])

    def test_list_initializes_missing_personal_plan(self):
        user_without_plan = User.objects.create_user(
            email="without-plan@example.com",
            password="A-secure-password-123",
        )
        self.client.force_authenticate(user=user_without_plan)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan = Plan.objects.get(owner=user_without_plan)
        self.assertEqual([item["id"] for item in response.data], [plan.id])

    def test_retrieve_returns_current_users_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.plan.id)

    def test_group_member_can_retrieve_group_plan(self):
        member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        Membership.objects.create(
            group=self.group,
            user=member,
            role=Membership.Role.MEMBER,
        )
        self.client.force_authenticate(user=member)

        response = self.client.get(self.group_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.group_plan.id)
        self.assertFalse(response.data["can_manage"])

    def test_patch_updates_current_users_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.detail_url,
            {
                "name": "My weekly menu",
                "color": "#A78BFA",
                "enabled_meal_types": ["lunch", "dinner"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.name, "My weekly menu")
        self.assertEqual(self.plan.color, "#A78BFA")
        self.assertEqual(
            self.plan.enabled_meal_types,
            [PlanItem.MealType.LUNCH, PlanItem.MealType.DINNER],
        )

    def test_group_owner_can_update_group_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.group_detail_url,
            {"enabled_meal_types": ["dinner"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.group_plan.refresh_from_db()
        self.assertEqual(
            self.group_plan.enabled_meal_types,
            [PlanItem.MealType.DINNER],
        )

    def test_group_plan_name_and_color_updates_group(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.group_detail_url,
            {"name": "Home", "color": "#38BDF8"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Home")
        self.assertEqual(self.group.color, "#38BDF8")

    def test_group_member_cannot_update_group_plan(self):
        member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        Membership.objects.create(
            group=self.group,
            user=member,
            role=Membership.Role.MEMBER,
        )
        self.client.force_authenticate(user=member)

        response = self.client.patch(
            self.group_detail_url,
            {"enabled_meal_types": ["dinner"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.group_plan.refresh_from_db()
        self.assertEqual(
            self.group_plan.enabled_meal_types,
            list(PlanItem.MealType.values),
        )

    def test_patch_rejects_invalid_name_and_color(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.detail_url,
            {"name": "", "color": "blue"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("color", response.data)

    def test_another_users_plan_is_not_accessible(self):
        self.client.force_authenticate(user=self.user)

        get_response = self.client.get(self.other_detail_url)
        patch_response = self.client.patch(
            self.other_detail_url,
            {"enabled_meal_types": ["lunch"]},
            format="json",
        )

        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)
        self.other_plan.refresh_from_db()
        self.assertEqual(
            self.other_plan.enabled_meal_types,
            list(PlanItem.MealType.values),
        )


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
        self.group = create_group(owner=self.user, name="Family", color="#A78BFA")
        self.group_plan = self.group.plan
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

    def test_list_rejects_invalid_plan_ids(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-11-01",
                "date_to": "2026-11-07",
                "plan_ids": f"{self.plan.id},invalid",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan_ids", response.data)

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

    def test_list_contains_items_from_selected_accessible_plans(self):
        personal_item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.BREAKFAST,
        )
        group_item = create_plan_item(
            plan=self.group_plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.DINNER,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-11-01",
                "date_to": "2026-11-07",
                "plan_ids": f"{self.plan.id},{self.group_plan.id}",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data],
            [personal_item.id, group_item.id],
        )

    def test_list_ignores_inaccessible_plan_ids(self):
        personal_item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
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
            {
                "date_from": "2026-11-01",
                "date_to": "2026-11-07",
                "plan_ids": f"{self.plan.id},{self.other_plan.id}",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [personal_item.id])

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
                "meal_snapshot": {"name": "Spoofed meal"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PlanItem.objects.get(pk=response.data["id"])
        self.assertEqual(item.plan, self.plan)
        self.assertEqual(item.meal_snapshot["name"], "Vegetable soup")

    def test_create_assigns_selected_group_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            {
                "plan_id": self.group_plan.id,
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.meal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PlanItem.objects.get(pk=response.data["id"])
        self.assertEqual(item.plan, self.group_plan)

    def test_group_member_can_create_item_with_own_meal(self):
        Membership.objects.create(
            group=self.group,
            user=self.other_user,
            role=Membership.Role.MEMBER,
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            self.url,
            {
                "plan_id": self.group_plan.id,
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.other_meal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PlanItem.objects.get(pk=response.data["id"])
        self.assertEqual(item.plan, self.group_plan)
        self.assertEqual(item.meal, self.other_meal)

    def test_create_rejects_inaccessible_plan(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            {
                "plan_id": self.other_plan.id,
                "date": "2026-11-02",
                "meal_type": "lunch",
                "meal_id": self.meal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan_id", response.data)

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

    def test_group_member_can_update_group_plan_item(self):
        Membership.objects.create(
            group=self.group,
            user=self.other_user,
            role=Membership.Role.MEMBER,
        )
        item = create_plan_item(
            plan=self.group_plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.patch(
            reverse("plan-item-detail", args=(item.id,)),
            {"date": "2026-11-03", "meal_type": "dinner"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.date, date(2026, 11, 3))
        self.assertEqual(item.meal_type, PlanItem.MealType.DINNER)

    def test_group_member_can_delete_group_plan_item(self):
        Membership.objects.create(
            group=self.group,
            user=self.other_user,
            role=Membership.Role.MEMBER,
        )
        item = create_plan_item(
            plan=self.group_plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.delete(reverse("plan-item-detail", args=(item.id,)))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlanItem.objects.filter(pk=item.id).exists())

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

    def test_delete_removes_only_requested_plan_item(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        remaining_item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(reverse("plan-item-detail", args=(item.id,)))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlanItem.objects.filter(pk=item.id).exists())
        self.assertTrue(PlanItem.objects.filter(pk=remaining_item.id).exists())
        self.assertTrue(Meal.objects.filter(pk=self.meal.id).exists())

    def test_delete_is_not_available_to_another_user(self):
        item = create_plan_item(
            plan=self.plan,
            meal=self.meal,
            scheduled_date=date(2026, 11, 2),
            meal_type=PlanItem.MealType.LUNCH,
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.delete(reverse("plan-item-detail", args=(item.id,)))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(PlanItem.objects.filter(pk=item.id).exists())
