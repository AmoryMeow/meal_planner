import uuid
from datetime import timedelta

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

DEFAULT_GROUP_COLOR = "#0EA5E9"
INVITE_LIFETIME_DAYS = 7

group_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a color in #RRGGBB format.",
)


class MembershipRole(models.TextChoices):
    OWNER = "owner", "Owner"
    MEMBER = "member", "Member"


class InviteStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REVOKED = "revoked", "Revoked"


def get_invite_expiration():
    return timezone.now() + timedelta(days=INVITE_LIFETIME_DAYS)


class Group(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(
        max_length=7,
        default=DEFAULT_GROUP_COLOR,
        validators=(group_color_validator,),
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Membership",
        related_name="meal_groups",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name", "id")
        verbose_name = "Meal group"
        verbose_name_plural = "Meal groups"

    def __str__(self):
        return self.name


class Membership(models.Model):
    Role = MembershipRole

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    role = models.CharField(max_length=16, choices=MembershipRole.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("group_id", "role", "id")
        constraints = (
            models.UniqueConstraint(
                fields=("group", "user"),
                name="groups_membership_unique_group_user",
            ),
            models.UniqueConstraint(
                fields=("group",),
                condition=models.Q(role=MembershipRole.OWNER),
                name="groups_membership_unique_owner",
            ),
        )

    def __str__(self):
        return f"{self.user} in {self.group} ({self.get_role_display()})"


class Invite(models.Model):
    Status = InviteStatus

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    email = models.EmailField()
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sent_group_invites",
        null=True,
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(
        max_length=16,
        choices=InviteStatus.choices,
        default=InviteStatus.PENDING,
    )
    expires_at = models.DateTimeField(default=get_invite_expiration)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("group_id", "status", "id")
        constraints = (
            models.UniqueConstraint(
                Lower("email"),
                "group",
                condition=models.Q(status=InviteStatus.PENDING),
                name="groups_invite_unique_pending_group_email",
            ),
            models.CheckConstraint(
                check=(
                    models.Q(
                        status=InviteStatus.ACCEPTED,
                        accepted_at__isnull=False,
                    )
                    | (
                        ~models.Q(status=InviteStatus.ACCEPTED)
                        & models.Q(accepted_at__isnull=True)
                    )
                ),
                name="groups_invite_accepted_at_matches_status",
            ),
        )

    @property
    def is_expired(self):
        return self.status == InviteStatus.PENDING and self.expires_at <= timezone.now()

    def __str__(self):
        return f"{self.email} invited to {self.group}"
