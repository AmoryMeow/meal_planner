from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from groups.models import (
    DEFAULT_GROUP_COLOR,
    INVITE_LIFETIME_DAYS,
    Group,
    Invite,
    Membership,
)


class GroupModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.member = User.objects.create_user(
            email="member@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")

    def test_group_uses_default_color(self):
        self.assertEqual(self.group.color, DEFAULT_GROUP_COLOR)

    def test_group_rejects_invalid_color(self):
        group = Group(name="Friends", color="blue")

        with self.assertRaises(ValidationError):
            group.full_clean()

    def test_user_can_join_multiple_groups(self):
        second_group = Group.objects.create(name="Friends")
        first_membership = Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )
        second_membership = Membership.objects.create(
            group=second_group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )

        self.assertQuerySetEqual(
            self.member.group_memberships.order_by("id"),
            [first_membership, second_membership],
        )

    def test_user_can_have_only_one_membership_per_group(self):
        Membership.objects.create(
            group=self.group,
            user=self.member,
            role=Membership.Role.MEMBER,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Membership.objects.create(
                group=self.group,
                user=self.member,
                role=Membership.Role.OWNER,
            )

    def test_group_can_have_only_one_owner(self):
        Membership.objects.create(
            group=self.group,
            user=self.owner,
            role=Membership.Role.OWNER,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Membership.objects.create(
                group=self.group,
                user=self.member,
                role=Membership.Role.OWNER,
            )

    def test_deleting_group_deletes_memberships(self):
        membership = Membership.objects.create(
            group=self.group,
            user=self.owner,
            role=Membership.Role.OWNER,
        )

        self.group.delete()

        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())


class InviteModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.group = Group.objects.create(name="Family")

    def test_invite_uses_secure_defaults(self):
        before_creation = timezone.now()

        invite = Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
        )

        expected_expiration = before_creation + timedelta(days=INVITE_LIFETIME_DAYS)
        self.assertEqual(invite.status, Invite.Status.PENDING)
        self.assertIsNotNone(invite.token)
        self.assertFalse(invite.is_expired)
        self.assertGreaterEqual(invite.expires_at, expected_expiration)

    def test_group_cannot_have_duplicate_pending_invites_for_email(self):
        Invite.objects.create(
            group=self.group,
            email="Member@example.com",
            invited_by=self.owner,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Invite.objects.create(
                group=self.group,
                email="member@example.com",
                invited_by=self.owner,
            )

    def test_group_can_reinvite_after_previous_invite_is_revoked(self):
        Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
            status=Invite.Status.REVOKED,
        )

        invite = Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
        )

        self.assertEqual(invite.status, Invite.Status.PENDING)

    def test_accepted_invite_requires_acceptance_time(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invite.objects.create(
                group=self.group,
                email="member@example.com",
                invited_by=self.owner,
                status=Invite.Status.ACCEPTED,
            )

    def test_expired_pending_invite_is_marked_as_expired(self):
        invite = Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
            expires_at=timezone.now() - timedelta(seconds=1),
        )

        self.assertTrue(invite.is_expired)

    def test_deleting_group_deletes_invites(self):
        invite = Invite.objects.create(
            group=self.group,
            email="member@example.com",
            invited_by=self.owner,
        )

        self.group.delete()

        self.assertFalse(Invite.objects.filter(pk=invite.pk).exists())
