from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from meals.models import Meal

DEFAULT_PLAN_NAME = "Personal plan"
DEFAULT_PLAN_COLOR = "#0EA5E9"

plan_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a color in #RRGGBB format.",
)


class MealType(models.TextChoices):
    BREAKFAST = "breakfast", "Breakfast"
    LUNCH = "lunch", "Lunch"
    DINNER = "dinner", "Dinner"


def default_enabled_meal_types():
    return list(MealType.values)


def validate_enabled_meal_types(value):
    if not isinstance(value, list):
        raise ValidationError("Meal sections must be a list.")
    if not value:
        raise ValidationError("At least one meal section must be enabled.")
    if any(meal_type not in MealType.values for meal_type in value):
        raise ValidationError("Meal sections contain unsupported values.")
    if len(value) != len(set(value)):
        raise ValidationError("Meal sections must not contain duplicates.")


class Plan(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personal_plan",
        blank=True,
        null=True,
    )
    group = models.OneToOneField(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="plan",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=100, default=DEFAULT_PLAN_NAME)
    color = models.CharField(
        max_length=7,
        default=DEFAULT_PLAN_COLOR,
        validators=(plan_color_validator,),
    )
    enabled_meal_types = models.JSONField(
        default=default_enabled_meal_types,
        validators=(validate_enabled_meal_types,),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = (
            models.CheckConstraint(
                check=(
                    models.Q(owner__isnull=False, group__isnull=True)
                    | models.Q(owner__isnull=True, group__isnull=False)
                ),
                name="planning_plan_exactly_one_scope",
            ),
        )

    def __str__(self):
        return self.name


class PlanItem(models.Model):
    MealType = MealType

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="items",
    )
    date = models.DateField()
    meal_type = models.CharField(max_length=16, choices=MealType.choices)
    meal = models.ForeignKey(
        Meal,
        on_delete=models.PROTECT,
        related_name="plan_items",
    )
    servings = models.PositiveSmallIntegerField(
        default=1,
        validators=(MinValueValidator(1),),
    )
    note = models.TextField(blank=True, default="")
    meal_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("date", "id")
        indexes = [
            models.Index(
                fields=("plan", "date"),
                name="planning_item_plan_date_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(servings__gt=0),
                name="planning_planitem_servings_gt_zero",
            ),
        ]

    def clean(self):
        super().clean()
        if not self.plan_id or not self.meal_id:
            return
        if self.plan.owner_id is not None:
            if self.plan.owner_id != self.meal.owner_id:
                raise ValidationError(
                    {"meal": "Meal must be available to the plan owner."}
                )
            return
        if not self.plan.group.memberships.filter(user_id=self.meal.owner_id).exists():
            raise ValidationError(
                {"meal": "Meal owner must be a member of the plan group."}
            )

    def __str__(self):
        return f"{self.date} {self.get_meal_type_display()}: {self.meal}"
