from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.models import Group, Invite, Membership
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


class GroupMemberApiTests(APITestCase):
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
        self.group = create_group(owner=self.owner, name="Family")
        self.membership = Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        self.owner_membership = self.group.memberships.get(user=self.owner)
        self.url = reverse(
            "group-member-detail",
            args=(self.group.id, self.membership.id),
        )

    def test_removing_member_requires_authentication(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_only_owner_can_remove_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Membership.objects.filter(pk=self.membership.pk).exists())

    def test_non_member_cannot_access_group_membership(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_remove_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Membership.objects.filter(pk=self.membership.pk).exists())
        self.assertTrue(Group.objects.filter(pk=self.group.pk).exists())
        self.assertTrue(Group.objects.get(pk=self.group.pk).plan)

    def test_owner_cannot_remove_owner_membership(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "group-member-detail",
            args=(self.group.id, self.owner_membership.id),
        )

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "The group owner cannot be removed.")
        self.assertTrue(Membership.objects.filter(pk=self.owner_membership.pk).exists())


class GroupInviteApiTests(APITestCase):
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
        self.group = create_group(owner=self.owner, name="Family")
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        self.other_group = create_group(owner=self.other_user, name="Friends")
        self.list_url = reverse("group-invite-list", args=(self.group.id,))

    def test_invites_require_authentication(self):
        invite = Invite.objects.create(
            group=self.group,
            email="guest@example.com",
            invited_by=self.owner,
        )

        list_response = self.client.get(self.list_url)
        create_response = self.client.post(
            self.list_url,
            {"email": "new@example.com"},
            format="json",
        )
        delete_response = self.client.delete(
            reverse("group-invite-detail", args=(self.group.id, invite.id))
        )

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(create_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(delete_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_only_owner_can_manage_invites(self):
        invite = Invite.objects.create(
            group=self.group,
            email="guest@example.com",
            invited_by=self.owner,
        )
        self.client.force_authenticate(user=self.member)

        list_response = self.client.get(self.list_url)
        create_response = self.client.post(
            self.list_url,
            {"email": "new@example.com"},
            format="json",
        )
        delete_response = self.client.delete(
            reverse("group-invite-detail", args=(self.group.id, invite.id))
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_cannot_access_group_invites(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_lists_only_pending_invites_for_group(self):
        pending_invite = Invite.objects.create(
            group=self.group,
            email="pending@example.com",
            invited_by=self.owner,
        )
        Invite.objects.create(
            group=self.group,
            email="revoked@example.com",
            invited_by=self.owner,
            status=Invite.Status.REVOKED,
        )
        Invite.objects.create(
            group=self.other_group,
            email="other@example.com",
            invited_by=self.other_user,
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], pending_invite.id)
        self.assertEqual(response.data[0]["email"], pending_invite.email)
        self.assertIn("token", response.data[0])
        self.assertFalse(response.data[0]["is_expired"])

    def test_owner_creates_invite_with_normalized_email(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"email": "  Guest@Example.COM  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invite = Invite.objects.get(pk=response.data["id"])
        self.assertEqual(invite.email, "guest@example.com")
        self.assertEqual(invite.group, self.group)
        self.assertEqual(invite.invited_by, self.owner)

    def test_owner_cannot_invite_existing_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"email": self.member.email.upper()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["email"][0],
            "This user is already a group member.",
        )

    def test_owner_cannot_create_duplicate_active_invite(self):
        Invite.objects.create(
            group=self.group,
            email="guest@example.com",
            invited_by=self.owner,
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"email": "GUEST@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["email"][0],
            "An active invitation already exists for this email.",
        )

    def test_owner_can_replace_expired_invite(self):
        expired_invite = Invite.objects.create(
            group=self.group,
            email="guest@example.com",
            invited_by=self.owner,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"email": "guest@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        expired_invite.refresh_from_db()
        self.assertEqual(expired_invite.status, Invite.Status.REVOKED)
        self.assertNotEqual(response.data["id"], expired_invite.id)

    def test_owner_can_revoke_pending_invite(self):
        invite = Invite.objects.create(
            group=self.group,
            email="guest@example.com",
            invited_by=self.owner,
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            reverse("group-invite-detail", args=(self.group.id, invite.id))
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        invite.refresh_from_db()
        self.assertEqual(invite.status, Invite.Status.REVOKED)


class InviteAcceptanceApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.invited_user = User.objects.create_user(
            email="guest@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.owner, name="Family")
        self.invite = Invite.objects.create(
            group=self.group,
            email=self.invited_user.email,
            invited_by=self.owner,
        )
        self.url = reverse("invite-accept", args=(self.invite.token,))

    def test_accepting_invite_requires_authentication(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invited_user_can_accept_invite(self):
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.invite.refresh_from_db()
        membership = Membership.objects.get(
            group=self.group,
            user=self.invited_user,
        )
        self.assertEqual(membership.role, Membership.Role.MEMBER)
        self.assertEqual(self.invite.status, Invite.Status.ACCEPTED)
        self.assertIsNotNone(self.invite.accepted_at)
        self.assertEqual(response.data["id"], self.group.id)
        self.assertEqual(response.data["role"], Membership.Role.MEMBER)
        self.assertEqual(response.data["plan_id"], self.group.plan.id)
        self.assertEqual(response.data["member_count"], 2)

    def test_user_with_different_email_cannot_accept_invite(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "This invitation was sent to a different email address.",
        )
        self.assertFalse(
            Membership.objects.filter(group=self.group, user=self.other_user).exists()
        )

    def test_expired_invite_cannot_be_accepted(self):
        self.invite.expires_at = timezone.now() - timedelta(seconds=1)
        self.invite.save(update_fields=("expires_at", "updated_at"))
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "This invitation has expired.")
        self.assertFalse(
            Membership.objects.filter(
                group=self.group,
                user=self.invited_user,
            ).exists()
        )

    def test_revoked_invite_cannot_be_accepted(self):
        self.invite.status = Invite.Status.REVOKED
        self.invite.save(update_fields=("status", "updated_at"))
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "This invitation is no longer available.",
        )

    def test_accepting_invite_is_idempotent(self):
        self.client.force_authenticate(user=self.invited_user)

        first_response = self.client.post(self.url)
        self.invite.refresh_from_db()
        first_accepted_at = self.invite.accepted_at
        second_response = self.client.post(self.url)

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Membership.objects.filter(
                group=self.group,
                user=self.invited_user,
            ).count(),
            1,
        )
        self.invite.refresh_from_db()
        self.assertEqual(self.invite.accepted_at, first_accepted_at)
