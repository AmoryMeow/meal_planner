from datetime import date

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from groups.models import Group, Membership
from planning.models import MealType
from poker.models import PokerSession


class PokerAdminTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            password="A-secure-password-123",
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")
        Membership.objects.create(
            group=self.group,
            user=self.organizer,
            role=Membership.Role.OWNER,
        )
        self.session = PokerSession.objects.create(
            group=self.group,
            organizer=self.organizer,
            date=date(2026, 11, 6),
            meal_type=MealType.DINNER,
        )
        self.client.force_login(self.admin_user)

    def test_poker_session_is_registered(self):
        self.assertTrue(admin.site.is_registered(PokerSession))

    def test_poker_session_admin_lists_sessions(self):
        response = self.client.get(reverse("admin:poker_pokersession_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.group.name)
        self.assertContains(response, self.organizer.email)
