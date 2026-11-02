from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from accounts.models import User
from groups.models import DEFAULT_GROUP_COLOR, Group, Membership


class GroupModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")

    def test_group_uses_default_color(self):
        self.assertEqual(self.group.color, DEFAULT_GROUP_COLOR)

    def test_group_rejects_invalid_color(self):
        group = Group(name="Friends", color="blue")

        with self.assertRaises(ValidationError):
            group.full_clean()

    def test_user_can_join_multiple_groups(self):
        second_group = Group.objects.create(name="Friends")
        first_membership = Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        second_membership = Membership.objects.create(
            group=second_group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )

        self.assertQuerySetEqual(
            self.member.group_memberships.order_by("id"),
            [first_membership, second_membership],
        )

    def test_user_can_have_only_one_membership_per_group(self):
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Membership.objects.create(
                group=self.group,
                user=self.member,
                role=Membership.Role.OWNER,
            )

    def test_group_can_have_only_one_owner(self):
        Membership.objects.create(
            group=self.group,
            user=self.owner,
            role=Membership.Role.OWNER,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Membership.objects.create(
                group=self.group,
                user=self.member,
                role=Membership.Role.OWNER,
            )

    def test_deleting_group_deletes_memberships(self):
        membership = Membership.objects.create(
            group=self.group,
            user=self.owner,
            role=Membership.Role.OWNER,
        )

        self.group.delete()

        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())
