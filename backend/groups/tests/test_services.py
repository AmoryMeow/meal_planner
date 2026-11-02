from django.test import TestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group


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
