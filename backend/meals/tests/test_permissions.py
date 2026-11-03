from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Meal, MealShare
from meals.permissions import (
    MealPermission,
    can_edit_meal,
    can_read_meal,
    get_editable_meals,
    get_readable_meals,
)


class MealAccessTests(TestCase):
    def setUp(self):
        self.meal_owner = User.objects.create_user(
            email="meal-owner@example.com",
            password="A-secure-password-123",
        )
        self.group_owner = User.objects.create_user(
            email="group-owner@example.com",
            password="A-secure-password-123",
        )
        self.outsider = User.objects.create_user(
            email="outsider@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.group_owner, name="Family")
        Membership.objects.create(
            group=self.group,
            user=self.meal_owner,
            role=Membership.Role.MEMBER,
        )
        self.meal = Meal.objects.create(
            owner=self.meal_owner,
            name="Vegetable soup",
        )
        self.share = MealShare.objects.create(
            meal=self.meal,
            group=self.group,
        )

    def test_owner_can_read_and_edit_own_meal(self):
        self.assertTrue(can_read_meal(self.meal_owner, self.meal))
        self.assertTrue(can_edit_meal(self.meal_owner, self.meal))
        self.assertQuerySetEqual(get_readable_meals(self.meal_owner), [self.meal])
        self.assertQuerySetEqual(get_editable_meals(self.meal_owner), [self.meal])

    def test_group_member_can_read_read_only_share(self):
        self.assertTrue(can_read_meal(self.group_owner, self.meal))
        self.assertFalse(can_edit_meal(self.group_owner, self.meal))
        self.assertQuerySetEqual(get_readable_meals(self.group_owner), [self.meal])
        self.assertFalse(get_editable_meals(self.group_owner).exists())

    def test_group_member_can_edit_editable_share(self):
        self.share.access = MealShare.Access.EDIT
        self.share.save(update_fields=("access", "updated_at"))

        self.assertTrue(can_edit_meal(self.group_owner, self.meal))
        self.assertQuerySetEqual(get_editable_meals(self.group_owner), [self.meal])

    def test_outsider_cannot_access_shared_meal(self):
        self.assertFalse(can_read_meal(self.outsider, self.meal))
        self.assertFalse(can_edit_meal(self.outsider, self.meal))
        self.assertFalse(get_readable_meals(self.outsider).exists())
        self.assertFalse(get_editable_meals(self.outsider).exists())

    def test_anonymous_user_cannot_access_meals(self):
        anonymous = AnonymousUser()

        self.assertFalse(can_read_meal(anonymous, self.meal))
        self.assertFalse(can_edit_meal(anonymous, self.meal))
        self.assertFalse(get_readable_meals(anonymous).exists())
        self.assertFalse(get_editable_meals(anonymous).exists())

    def test_readable_queryset_does_not_duplicate_meal_shared_to_multiple_groups(self):
        second_group = create_group(owner=self.group_owner, name="Friends")
        MealShare.objects.create(meal=self.meal, group=second_group)

        self.assertQuerySetEqual(get_readable_meals(self.group_owner), [self.meal])


class MealPermissionTests(TestCase):
    def setUp(self):
        self.meal_owner = User.objects.create_user(
            email="meal-owner@example.com",
            password="A-secure-password-123",
        )
        self.group_owner = User.objects.create_user(
            email="group-owner@example.com",
            password="A-secure-password-123",
        )
        self.outsider = User.objects.create_user(
            email="outsider@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.group_owner, name="Family")
        self.meal = Meal.objects.create(
            owner=self.meal_owner,
            name="Vegetable soup",
        )
        self.share = MealShare.objects.create(
            meal=self.meal,
            group=self.group,
        )
        self.permission = MealPermission()

    def has_permission(self, user, method):
        request = SimpleNamespace(user=user, method=method)
        return self.permission.has_object_permission(request, None, self.meal)

    def test_safe_method_requires_read_access(self):
        self.assertTrue(self.has_permission(self.group_owner, "GET"))
        self.assertFalse(self.has_permission(self.outsider, "GET"))

    def test_update_requires_edit_access(self):
        self.assertFalse(self.has_permission(self.group_owner, "PATCH"))
        self.share.access = MealShare.Access.EDIT
        self.share.save(update_fields=("access", "updated_at"))

        self.assertTrue(self.has_permission(self.group_owner, "PATCH"))

    def test_delete_remains_owner_only(self):
        self.share.access = MealShare.Access.EDIT
        self.share.save(update_fields=("access", "updated_at"))

        self.assertFalse(self.has_permission(self.group_owner, "DELETE"))
        self.assertTrue(self.has_permission(self.meal_owner, "DELETE"))
