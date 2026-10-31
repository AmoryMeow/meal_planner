from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Meal(models.Model):
    class Source(models.TextChoices):
        HOME = "home", "Home"
        RESTAURANT = "restaurant", "Restaurant"
        DELIVERY = "delivery", "Delivery"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meals",
    )
    name = models.CharField(max_length=255)
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.HOME,
    )
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


def normalize_ingredient_name(name):
    return " ".join(name.split()).casefold()


class Ingredient(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ingredients",
    )
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("owner", "normalized_name"),
                name="meals_ingredient_unique_normalized_name_per_owner",
            ),
        ]
        ordering = ("name", "id")

    def save(self, *args, **kwargs):
        self.name = " ".join(self.name.split())
        self.normalized_name = normalize_ingredient_name(self.name)
        update_fields = kwargs.get("update_fields")
        if update_fields and "name" in update_fields:
            kwargs["update_fields"] = {*update_fields, "normalized_name"}
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class MealIngredient(models.Model):
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="ingredients",
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.RESTRICT,
        related_name="meal_ingredients",
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=32)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name="meals_mealingredient_quantity_gt_zero",
            ),
        ]

    def clean(self):
        super().clean()
        if (
            self.meal_id
            and self.ingredient_id
            and self.meal.owner_id != self.ingredient.owner_id
        ):
            raise ValidationError(
                {"ingredient": "Ingredient must belong to the meal owner."}
            )

    def __str__(self):
        return f"{self.ingredient.name} — {self.meal.name}"
