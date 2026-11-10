from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts.models import User
from groups.models import Group, Membership
from planning.models import MealType
from poker.models import PokerSession


class PokerSessionTests(TestCase):
    def setUp(self):
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

    def test_member_can_organize_session(self):
        session = PokerSession(
            group=self.group,
            organizer=self.organizer,
            date=date(2026, 11, 6),
            meal_type=MealType.DINNER,
        )

        session.full_clean()
        session.save()

        self.assertEqual(session.status, PokerSession.Status.WAITING)
        self.assertEqual(
            str(session),
            "Family: 2026-11-06 Dinner",
        )

    def test_non_member_cannot_organize_session(self):
        outsider = User.objects.create_user(
            email="outsider@example.com",
            password="A-secure-password-123",
        )
        session = PokerSession(
            group=self.group,
            organizer=outsider,
            date=date(2026, 11, 6),
            meal_type=MealType.DINNER,
        )

        with self.assertRaises(ValidationError) as error:
            session.full_clean()

        self.assertIn("organizer", error.exception.message_dict)

    def test_session_rejects_unsupported_status(self):
        session = PokerSession(
            group=self.group,
            organizer=self.organizer,
            date=date(2026, 11, 6),
            meal_type=MealType.DINNER,
            status="unknown",
        )

        with self.assertRaises(ValidationError) as error:
            session.full_clean()

        self.assertIn("status", error.exception.message_dict)
