from django.test import TestCase

from accounts.models import User
from groups.models import Membership
from groups.services import (
    GroupOwnerRemovalError,
    create_group,
    remove_group_member,
    update_group,
)


class GroupServiceTests(TestCase):
    def test_create_group_adds_owner_membership(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )

        group = create_group(owner=owner, name="Family", color="#A78BFA")

        membership = group.memberships.get()
        self.assertEqual(group.name, "Family")
        self.assertEqual(group.color, "#A78BFA")
        self.assertEqual(membership.user, owner)
        self.assertEqual(membership.role, Membership.Role.OWNER)
        self.assertEqual(group.plan.name, group.name)
        self.assertEqual(group.plan.color, group.color)
        self.assertIsNone(group.plan.owner)

    def test_update_group_updates_group_plan(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        group = create_group(owner=owner, name="Family", color="#A78BFA")

        update_group(group=group, name="Friends", color="#38BDF8")

        group.refresh_from_db()
        group.plan.refresh_from_db()
        self.assertEqual(group.name, "Friends")
        self.assertEqual(group.color, "#38BDF8")
        self.assertEqual(group.plan.name, "Friends")
        self.assertEqual(group.plan.color, "#38BDF8")

    def test_remove_group_member_deletes_regular_membership(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        group = create_group(owner=owner, name="Family")
        membership = Membership.objects.create(
            group=group,
            user=member,
            role=Membership.Role.MEMBER,
        )

        remove_group_member(membership=membership)

        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())

    def test_remove_group_member_rejects_owner_membership(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        group = create_group(owner=owner, name="Family")
        membership = group.memberships.get()

        with self.assertRaisesMessage(
            GroupOwnerRemovalError,
            "The group owner cannot be removed.",
        ):
            remove_group_member(membership=membership)

        self.assertTrue(Membership.objects.filter(pk=membership.pk).exists())
