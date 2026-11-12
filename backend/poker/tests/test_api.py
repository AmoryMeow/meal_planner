from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Meal, MealShare
from planning.models import MealType, PlanItem
from poker.models import PokerSession


class PokerApiTests(APITestCase):
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
        self.group = create_group(owner=self.owner, name="Family", color="#A78BFA")
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        self.pasta = Meal.objects.create(
            owner=self.owner,
            name="Pasta",
            source=Meal.Source.HOME,
        )
        self.pizza = Meal.objects.create(
            owner=self.member,
            name="Pizza",
            source=Meal.Source.DELIVERY,
        )
        self.private_meal = Meal.objects.create(
            owner=self.owner,
            name="Private soup",
        )
        MealShare.objects.create(meal=self.pasta, group=self.group)
        MealShare.objects.create(meal=self.pizza, group=self.group)
        self.list_url = reverse("poker-session-list")
        self.session_date = timezone.localdate() + timedelta(days=3)

    def create_session(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            self.list_url,
            {
                "group_id": self.group.id,
                "date": self.session_date.isoformat(),
                "meal_type": MealType.DINNER,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return PokerSession.objects.get(pk=response.data["id"])

    def test_sessions_require_authentication(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_session_adds_organizer_and_returns_group_context(self):
        session = self.create_session()

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["group_id"], self.group.id)
        self.assertEqual(response.data[0]["group_color"], "#A78BFA")
        self.assertEqual(response.data[0]["organizer_id"], self.owner.id)
        self.assertEqual(response.data[0]["participant_count"], 1)
        self.assertTrue(response.data[0]["has_joined"])
        self.assertEqual(session.participants.get().user, self.owner)

    def test_create_session_rejects_past_date(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {
                "group_id": self.group.id,
                "date": (timezone.localdate() - timedelta(days=1)).isoformat(),
                "meal_type": MealType.DINNER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Session date cannot be in the past.")
        self.assertFalse(PokerSession.objects.exists())

    def test_non_member_cannot_list_or_retrieve_session(self):
        session = self.create_session()
        self.client.force_authenticate(user=self.outsider)

        list_response = self.client.get(self.list_url)
        detail_response = self.client.get(
            reverse("poker-session-detail", args=(session.id,))
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_available_meals_include_only_group_shares_and_support_filters(self):
        session = self.create_session()
        url = reverse("poker-session-meal-list", args=(session.id,))

        response = self.client.get(url, {"search": "p", "source": "home"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [meal["id"] for meal in response.data["results"]],
            [self.pasta.id],
        )

    def test_full_voting_flow_hides_votes_until_reveal_and_adds_winner(self):
        session = self.create_session()
        join_url = reverse("poker-session-join", args=(session.id,))
        start_url = reverse("poker-session-start", args=(session.id,))
        vote_url = reverse("poker-session-vote", args=(session.id,))
        reveal_url = reverse("poker-session-reveal", args=(session.id,))
        complete_url = reverse("poker-session-complete", args=(session.id,))
        add_url = reverse("poker-session-add-to-plan", args=(session.id,))

        self.client.force_authenticate(user=self.member)
        self.assertEqual(self.client.post(join_url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(start_url).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self.client.post(start_url).status_code, status.HTTP_200_OK)
        owner_vote = self.client.put(
            vote_url,
            {"meal_ids": [self.pasta.id, self.pizza.id]},
            format="json",
        )
        self.assertEqual(owner_vote.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.member)
        member_vote = self.client.put(
            vote_url,
            {"meal_ids": [self.pasta.id]},
            format="json",
        )
        self.assertEqual(member_vote.status_code, status.HTTP_200_OK)
        participants = {
            participant["user_id"]: participant
            for participant in member_vote.data["participants"]
        }
        self.assertIsNone(participants[self.owner.id]["votes"])
        self.assertEqual(
            participants[self.member.id]["votes"][0]["meal"]["id"],
            self.pasta.id,
        )
        self.assertIsNone(member_vote.data["results"])

        self.client.force_authenticate(user=self.owner)
        reveal_response = self.client.post(reveal_url)
        self.assertEqual(reveal_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            all(
                participant["votes"] is not None
                for participant in reveal_response.data["participants"]
            )
        )
        self.assertEqual(reveal_response.data["results"][0]["score"], 8)
        self.assertEqual(reveal_response.data["winner"]["id"], self.pasta.id)

        complete_response = self.client.post(complete_url, {}, format="json")
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            complete_response.data["status"],
            PokerSession.Status.COMPLETED,
        )

        self.client.force_authenticate(user=self.member)
        first_add = self.client.post(add_url)
        second_add = self.client.post(add_url)
        self.assertEqual(first_add.status_code, status.HTTP_200_OK)
        self.assertEqual(second_add.status_code, status.HTTP_200_OK)
        self.assertEqual(first_add.data["id"], second_add.data["id"])
        self.assertEqual(PlanItem.objects.count(), 1)

    def test_vote_rejects_private_meal(self):
        session = self.create_session()
        self.client.force_authenticate(user=self.member)
        self.client.post(reverse("poker-session-join", args=(session.id,)))
        self.client.force_authenticate(user=self.owner)
        self.client.post(reverse("poker-session-start", args=(session.id,)))

        response = self.client.put(
            reverse("poker-session-vote", args=(session.id,)),
            {"meal_ids": [self.private_meal.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
