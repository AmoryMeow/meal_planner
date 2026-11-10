from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from groups.models import Group, Membership
from planning.models import MealType


class PokerSessionStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    VOTING = "voting", "Voting"
    REVEALED = "revealed", "Revealed"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class PokerSession(models.Model):
    Status = PokerSessionStatus

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="poker_sessions",
    )
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_poker_sessions",
    )
    date = models.DateField()
    meal_type = models.CharField(max_length=16, choices=MealType.choices)
    status = models.CharField(
        max_length=16,
        choices=PokerSessionStatus.choices,
        default=PokerSessionStatus.WAITING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "id")
        indexes = (
            models.Index(
                fields=("group", "status"),
                name="poker_session_group_status_idx",
            ),
        )

    def clean(self):
        super().clean()
        if not self.group_id or not self.organizer_id:
            return
        if not Membership.objects.filter(
            group_id=self.group_id,
            user_id=self.organizer_id,
        ).exists():
            raise ValidationError(
                {"organizer": "Organizer must be a member of the selected group."}
            )

    def __str__(self):
        return f"{self.group}: {self.date} {self.get_meal_type_display()}"


class PokerParticipant(models.Model):
    session = models.ForeignKey(
        PokerSession,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="poker_participations",
    )
    is_ready = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("joined_at", "id")
        constraints = (
            models.UniqueConstraint(
                fields=("session", "user"),
                name="unique_poker_session_participant",
            ),
        )

    def clean(self):
        super().clean()
        if not self.session_id or not self.user_id:
            return
        if not Membership.objects.filter(
            group_id=self.session.group_id,
            user_id=self.user_id,
        ).exists():
            raise ValidationError(
                {"user": "Participant must be a member of the session group."}
            )

    def __str__(self):
        return f"{self.user} in {self.session}"
