from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

DEFAULT_GROUP_COLOR = "#0EA5E9"

group_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a color in #RRGGBB format.",
)


class MembershipRole(models.TextChoices):
    OWNER = "owner", "Owner"
    MEMBER = "member", "Member"


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
