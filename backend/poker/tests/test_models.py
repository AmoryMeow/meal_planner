from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts.models import User
from groups.models import Group, Membership
from meals.models import Meal, MealShare
from planning.models import MealType
from poker.models import PokerParticipant, PokerSession, PokerVote


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


class PokerParticipantTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password="A-secure-password-123",
        )
        self.participant = User.objects.create_user(
            email="participant@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")
        Membership.objects.create(
            group=self.group,
            user=self.organizer,
            role=Membership.Role.OWNER,
        )
        Membership.objects.create(
            group=self.group,
            user=self.participant,
            role=Membership.Role.MEMBER,
        )
        self.session = PokerSession.objects.create(
            group=self.group,
            organizer=self.organizer,
            date=date(2026, 11, 7),
            meal_type=MealType.DINNER,
        )

    def test_group_member_can_join_session(self):
        participation = PokerParticipant(
            session=self.session,
            user=self.participant,
        )

        participation.full_clean()
        participation.save()

        self.assertFalse(participation.is_ready)
        self.assertEqual(
            str(participation),
            "participant@example.com in Family: 2026-11-07 Dinner",
        )

    def test_non_member_cannot_join_session(self):
        outsider = User.objects.create_user(
            email="outsider@example.com",
            password="A-secure-password-123",
        )
        participation = PokerParticipant(
            session=self.session,
            user=outsider,
        )

        with self.assertRaises(ValidationError) as error:
            participation.full_clean()

        self.assertIn("user", error.exception.message_dict)

    def test_user_can_join_session_only_once(self):
        PokerParticipant.objects.create(
            session=self.session,
            user=self.participant,
        )
        duplicate = PokerParticipant(
            session=self.session,
            user=self.participant,
        )

        with self.assertRaises(ValidationError) as error:
            duplicate.full_clean()

        self.assertIn("__all__", error.exception.message_dict)


class PokerVoteTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password="A-secure-password-123",
        )
        self.voter = User.objects.create_user(
            email="voter@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")
        for user, role in (
            (self.organizer, Membership.Role.OWNER),
            (self.voter, Membership.Role.MEMBER),
        ):
            Membership.objects.create(group=self.group, user=user, role=role)
        self.session = PokerSession.objects.create(
            group=self.group,
            organizer=self.organizer,
            date=date(2026, 11, 8),
            meal_type=MealType.DINNER,
        )
        self.participant = PokerParticipant.objects.create(
            session=self.session,
            user=self.voter,
        )
        self.meal = Meal.objects.create(
            owner=self.organizer,
            name="Pasta",
        )
        MealShare.objects.create(meal=self.meal, group=self.group)

    def test_participant_can_rank_shared_meal(self):
        vote = PokerVote(
            participant=self.participant,
            meal=self.meal,
            priority=1,
        )

        vote.full_clean()
        vote.save()

        self.assertEqual(str(vote), f"{self.participant}: #1 Pasta")

    def test_vote_rejects_priority_outside_supported_range(self):
        for priority in (0, 4):
            with self.subTest(priority=priority):
                vote = PokerVote(
                    participant=self.participant,
                    meal=self.meal,
                    priority=priority,
                )

                with self.assertRaises(ValidationError) as error:
                    vote.full_clean()

                self.assertIn("priority", error.exception.message_dict)

    def test_vote_rejects_meal_not_shared_with_session_group(self):
        private_meal = Meal.objects.create(
            owner=self.voter,
            name="Private soup",
        )
        vote = PokerVote(
            participant=self.participant,
            meal=private_meal,
            priority=1,
        )

        with self.assertRaises(ValidationError) as error:
            vote.full_clean()

        self.assertIn("meal", error.exception.message_dict)

    def test_participant_cannot_rank_same_meal_twice(self):
        PokerVote.objects.create(
            participant=self.participant,
            meal=self.meal,
            priority=1,
        )
        duplicate = PokerVote(
            participant=self.participant,
            meal=self.meal,
            priority=2,
        )

        with self.assertRaises(ValidationError) as error:
            duplicate.full_clean()

        self.assertIn("__all__", error.exception.message_dict)

    def test_participant_cannot_reuse_priority(self):
        PokerVote.objects.create(
            participant=self.participant,
            meal=self.meal,
            priority=1,
        )
        second_meal = Meal.objects.create(
            owner=self.organizer,
            name="Pizza",
        )
        MealShare.objects.create(meal=second_meal, group=self.group)
        duplicate_priority = PokerVote(
            participant=self.participant,
            meal=second_meal,
            priority=1,
        )

        with self.assertRaises(ValidationError) as error:
            duplicate_priority.full_clean()

        self.assertIn("__all__", error.exception.message_dict)
