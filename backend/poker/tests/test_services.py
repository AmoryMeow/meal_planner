from datetime import date

from django.test import TestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Meal, MealShare
from planning.models import MealType, PlanItem
from poker.models import PokerSession
from poker.services import (
    PokerPermissionError,
    PokerSelectionError,
    PokerStateError,
    add_winner_to_plan,
    calculate_results,
    cancel_session,
    complete_session,
    create_session,
    join_session,
    reveal_results,
    start_voting,
    submit_votes,
)


class PokerServiceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        self.outsider = User.objects.create_user(
            email="outsider@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.owner, name="Family")
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        self.pasta = Meal.objects.create(owner=self.owner, name="Pasta")
        self.pizza = Meal.objects.create(owner=self.member, name="Pizza")
        MealShare.objects.create(meal=self.pasta, group=self.group)
        MealShare.objects.create(meal=self.pizza, group=self.group)

    def create_session(self):
        return create_session(
            group=self.group,
            organizer=self.owner,
            scheduled_date=date(2026, 11, 14),
            meal_type=MealType.DINNER,
        )

    def prepare_voting(self):
        session = self.create_session()
        join_session(session=session, user=self.member)
        return start_voting(session=session, actor=self.owner)

    def test_create_session_adds_organizer_as_participant(self):
        session = self.create_session()

        participant = session.participants.get()
        self.assertEqual(participant.user, self.owner)
        self.assertFalse(participant.is_ready)
        self.assertEqual(session.status, PokerSession.Status.WAITING)

    def test_non_member_cannot_create_or_join_session(self):
        with self.assertRaises(PokerPermissionError):
            create_session(
                group=self.group,
                organizer=self.outsider,
                scheduled_date=date(2026, 11, 14),
                meal_type=MealType.DINNER,
            )

        session = self.create_session()
        with self.assertRaises(PokerPermissionError):
            join_session(session=session, user=self.outsider)

    def test_join_rejects_duplicate_participant(self):
        session = self.create_session()
        join_session(session=session, user=self.member)

        with self.assertRaises(PokerStateError):
            join_session(session=session, user=self.member)

    def test_start_voting_requires_organizer_and_two_participants(self):
        session = self.create_session()
        with self.assertRaises(PokerStateError):
            start_voting(session=session, actor=self.owner)

        join_session(session=session, user=self.member)
        with self.assertRaises(PokerPermissionError):
            start_voting(session=session, actor=self.member)

        started_session = start_voting(session=session, actor=self.owner)
        self.assertEqual(started_session.status, PokerSession.Status.VOTING)

    def test_submit_votes_replaces_selection_and_marks_participant_ready(self):
        session = self.prepare_voting()

        participant = submit_votes(
            session=session,
            user=self.member,
            ordered_meal_ids=[self.pasta.id, self.pizza.id],
        )
        participant = submit_votes(
            session=session,
            user=self.member,
            ordered_meal_ids=[self.pizza.id],
        )

        participant.refresh_from_db()
        self.assertTrue(participant.is_ready)
        self.assertQuerySetEqual(
            participant.votes.values_list("meal_id", "priority"),
            [(self.pizza.id, 1)],
        )

    def test_submit_votes_rejects_unshared_meal(self):
        session = self.prepare_voting()
        private_meal = Meal.objects.create(owner=self.member, name="Private")

        with self.assertRaises(PokerSelectionError):
            submit_votes(
                session=session,
                user=self.member,
                ordered_meal_ids=[private_meal.id],
            )

    def test_reveal_requires_every_participant_vote(self):
        session = self.prepare_voting()
        submit_votes(
            session=session,
            user=self.owner,
            ordered_meal_ids=[self.pasta.id],
        )

        with self.assertRaises(PokerStateError):
            reveal_results(session=session, actor=self.owner)

    def test_results_use_three_two_one_scoring(self):
        session = self.prepare_voting()
        submit_votes(
            session=session,
            user=self.owner,
            ordered_meal_ids=[self.pasta.id, self.pizza.id],
        )
        submit_votes(
            session=session,
            user=self.member,
            ordered_meal_ids=[self.pasta.id],
        )

        revealed_session = reveal_results(session=session, actor=self.owner)
        results = calculate_results(revealed_session)

        self.assertEqual(revealed_session.status, PokerSession.Status.REVEALED)
        self.assertEqual(revealed_session.winner, self.pasta)
        self.assertEqual(
            [(result.meal, result.score) for result in results],
            [(self.pasta, 6), (self.pizza, 2)],
        )

    def test_tied_session_requires_organizer_to_choose_leader(self):
        session = self.prepare_voting()
        submit_votes(
            session=session,
            user=self.owner,
            ordered_meal_ids=[self.pasta.id, self.pizza.id],
        )
        submit_votes(
            session=session,
            user=self.member,
            ordered_meal_ids=[self.pizza.id, self.pasta.id],
        )
        session = reveal_results(session=session, actor=self.owner)

        self.assertIsNone(session.winner)
        with self.assertRaises(PokerSelectionError):
            complete_session(session=session, actor=self.owner)

        session = complete_session(
            session=session,
            actor=self.owner,
            winner_id=self.pizza.id,
        )
        self.assertEqual(session.status, PokerSession.Status.COMPLETED)
        self.assertEqual(session.winner, self.pizza)

    def test_group_member_adds_winner_to_plan_only_once(self):
        session = self.prepare_voting()
        for user in (self.owner, self.member):
            submit_votes(
                session=session,
                user=user,
                ordered_meal_ids=[self.pasta.id],
            )
        session = reveal_results(session=session, actor=self.owner)
        session = complete_session(session=session, actor=self.owner)

        first_item = add_winner_to_plan(session=session, actor=self.member)
        second_item = add_winner_to_plan(session=session, actor=self.member)

        self.assertEqual(first_item, second_item)
        self.assertEqual(PlanItem.objects.count(), 1)
        self.assertEqual(first_item.plan, self.group.plan)
        self.assertEqual(first_item.meal, self.pasta)
        self.assertEqual(first_item.date, session.date)
        self.assertEqual(first_item.meal_type, session.meal_type)

    def test_organizer_can_cancel_waiting_session(self):
        session = self.create_session()

        cancelled_session = cancel_session(session=session, actor=self.owner)

        self.assertEqual(cancelled_session.status, PokerSession.Status.CANCELLED)
