from django.test import TestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Meal, MealShare
from meals.services import (
    InvalidMealShareAccessError,
    MealShareGroupMembershipError,
    MealShareOwnershipError,
    revoke_meal_share,
    share_meal,
)


class MealShareServiceTests(TestCase):
    def setUp(self):
        self.meal_owner = User.objects.create_user(
            email="meal-owner@example.com",
            password="A-secure-password-123",
        )
        self.group_owner = User.objects.create_user(
            email="group-owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.group_owner, name="Family")
        self.membership = Membership.objects.create(
            group=self.group,
            user=self.meal_owner,
            role=Membership.Role.MEMBER,
        )
        self.meal = Meal.objects.create(
            owner=self.meal_owner,
            name="Vegetable soup",
        )

    def test_meal_owner_can_share_meal_with_their_group(self):
        share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
        )

        self.assertEqual(share.meal, self.meal)
        self.assertEqual(share.group, self.group)
        self.assertEqual(share.access, MealShare.Access.READ)

    def test_sharing_again_updates_access_without_creating_copy(self):
        first_share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
        )

        updated_share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
            access=MealShare.Access.EDIT,
        )

        self.assertEqual(updated_share.pk, first_share.pk)
        self.assertEqual(updated_share.access, MealShare.Access.EDIT)
        self.assertEqual(MealShare.objects.count(), 1)

    def test_user_cannot_share_another_users_meal(self):
        with self.assertRaisesMessage(
            MealShareOwnershipError,
            "Only the meal owner can manage sharing.",
        ):
            share_meal(
                meal=self.meal,
                group=self.group,
                actor=self.group_owner,
            )

        self.assertFalse(MealShare.objects.exists())

    def test_owner_cannot_share_meal_with_group_they_do_not_belong_to(self):
        other_group = create_group(owner=self.other_user, name="Friends")

        with self.assertRaisesMessage(
            MealShareGroupMembershipError,
            "The meal owner must belong to the group.",
        ):
            share_meal(
                meal=self.meal,
                group=other_group,
                actor=self.meal_owner,
            )

        self.assertFalse(MealShare.objects.exists())

    def test_share_rejects_unsupported_access(self):
        with self.assertRaisesMessage(
            InvalidMealShareAccessError,
            "Unsupported meal share access level.",
        ):
            share_meal(
                meal=self.meal,
                group=self.group,
                actor=self.meal_owner,
                access="owner",
            )

        self.assertFalse(MealShare.objects.exists())

    def test_meal_owner_can_revoke_share(self):
        share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
        )

        revoke_meal_share(share=share, actor=self.meal_owner)

        self.assertFalse(MealShare.objects.filter(pk=share.pk).exists())

    def test_other_user_cannot_revoke_share(self):
        share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
        )

        with self.assertRaisesMessage(
            MealShareOwnershipError,
            "Only the meal owner can manage sharing.",
        ):
            revoke_meal_share(share=share, actor=self.group_owner)

        self.assertTrue(MealShare.objects.filter(pk=share.pk).exists())

    def test_owner_can_revoke_share_after_leaving_group(self):
        share = share_meal(
            meal=self.meal,
            group=self.group,
            actor=self.meal_owner,
        )
        self.membership.delete()

        revoke_meal_share(share=share, actor=self.meal_owner)

        self.assertFalse(MealShare.objects.filter(pk=share.pk).exists())
