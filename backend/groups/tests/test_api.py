from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.models import Group, Membership
from groups.services import create_group


class GroupApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(
            owner=self.owner,
            name="Family",
            color="#A78BFA",
        )
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        self.other_group = create_group(
            owner=self.other_user,
            name="Other family",
        )
        self.url = reverse("group-list")
        self.detail_url = reverse("group-detail", args=(self.group.id,))

    def test_groups_require_authentication(self):
        list_response = self.client.get(self.url)
        create_response = self.client.post(
            self.url,
            {"name": "Friends", "color": "#0EA5E9"},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(create_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_only_current_users_groups(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0],
            {
                "id": self.group.id,
                "name": "Family",
                "color": "#A78BFA",
                "role": Membership.Role.OWNER,
                "plan_id": self.group.plan.id,
                "member_count": 2,
                "created_at": response.data[0]["created_at"],
                "updated_at": response.data[0]["updated_at"],
            },
        )

    def test_list_returns_member_role(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([group["id"] for group in response.data], [self.group.id])
        self.assertEqual(response.data[0]["role"], Membership.Role.MEMBER)

    def test_create_adds_group_owner_and_plan(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.url,
            {"name": "Friends", "color": "#38BDF8"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        group = Group.objects.get(pk=response.data["id"])
        membership = group.memberships.get()
        self.assertEqual(group.name, "Friends")
        self.assertEqual(group.color, "#38BDF8")
        self.assertEqual(membership.user, self.member)
        self.assertEqual(membership.role, Membership.Role.OWNER)
        self.assertEqual(response.data["role"], Membership.Role.OWNER)
        self.assertEqual(response.data["plan_id"], group.plan.id)
        self.assertEqual(response.data["member_count"], 1)

    def test_create_rejects_invalid_name_and_color(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {"name": "", "color": "blue"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("color", response.data)
        self.assertFalse(Group.objects.filter(color="blue").exists())

    def test_group_detail_requires_authentication(self):
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_group_member_can_view_members(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Membership.Role.MEMBER)
        self.assertEqual(
            [member["email"] for member in response.data["members"]],
            [self.owner.email, self.member.email],
        )
        self.assertEqual(
            [member["role"] for member in response.data["members"]],
            [Membership.Role.OWNER, Membership.Role.MEMBER],
        )

    def test_non_member_cannot_view_group(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_update_group_and_plan(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.detail_url,
            {"name": "Home", "color": "#38BDF8"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.group.refresh_from_db()
        self.group.plan.refresh_from_db()
        self.assertEqual(self.group.name, "Home")
        self.assertEqual(self.group.color, "#38BDF8")
        self.assertEqual(self.group.plan.name, "Home")
        self.assertEqual(self.group.plan.color, "#38BDF8")

    def test_member_cannot_update_group(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.detail_url,
            {"name": "Changed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Family")

    def test_owner_cannot_apply_invalid_group_settings(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.detail_url,
            {"name": "", "color": "blue"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("color", response.data)
