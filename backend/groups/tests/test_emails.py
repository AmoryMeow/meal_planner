from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from accounts.models import User
from groups.models import Invite
from groups.services import create_group, create_invite


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="Mealendar <noreply@example.com>",
    FRONTEND_URL="https://mealendar.example",
)
class InviteEmailTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.owner, name="Family")

    def test_invite_email_is_sent_after_transaction_commits(self):
        with self.captureOnCommitCallbacks(execute=True):
            invite = create_invite(
                group=self.group,
                invited_by=self.owner,
                email="guest@example.com",
            )

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["guest@example.com"])
        self.assertEqual(message.from_email, "Mealendar <noreply@example.com>")
        self.assertEqual(message.subject, "Join Family on Mealendar")
        self.assertIn(self.owner.email, message.body)
        self.assertIn(
            f"https://mealendar.example/invite/{invite.token}",
            message.body,
        )

    @patch("groups.emails.send_mail", side_effect=RuntimeError("SMTP unavailable"))
    def test_delivery_failure_keeps_invite_available(self, _send_mail):
        with (
            self.assertLogs("groups.emails", level="ERROR"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            invite = create_invite(
                group=self.group,
                invited_by=self.owner,
                email="guest@example.com",
            )

        self.assertTrue(Invite.objects.filter(pk=invite.pk).exists())
