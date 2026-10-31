from django.conf import settings
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
