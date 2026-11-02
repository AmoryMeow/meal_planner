from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from groups.models import Group, Invite, Membership


class GroupsAdminTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="A-secure-password-123",
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")
        self.membership = Membership.objects.create(
            group=self.group,
            user=self.owner,
            role=Membership.Role.OWNER,
        )
        self.client.force_login(self.admin_user)

    def test_group_models_are_registered(self):
        self.assertTrue(admin.site.is_registered(Group))
        self.assertTrue(admin.site.is_registered(Membership))
        self.assertTrue(admin.site.is_registered(Invite))

    def test_group_admin_lists_groups(self):
        response = self.client.get(reverse("admin:groups_group_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.group.name)
        self.assertContains(response, "1")

    def test_group_admin_displays_memberships_inline(self):
        response = self.client.get(
            reverse("admin:groups_group_change", args=(self.group.id,))
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.owner.email)

    def test_group_admin_displays_invites_inline(self):
        invite = Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
        )

        response = self.client.get(
            reverse("admin:groups_group_change", args=(self.group.id,))
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, invite.email)
