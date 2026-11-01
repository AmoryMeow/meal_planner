from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from meals.models import Meal


class Plan(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personal_plan",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.owner}'s plan"


class PlanItem(models.Model):
    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"

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
        if self.plan_id and self.meal_id and self.plan.owner_id != self.meal.owner_id:
            raise ValidationError({"meal": "Meal must be available to the plan owner."})

    def __str__(self):
        return f"{self.date} {self.get_meal_type_display()}: {self.meal}"
