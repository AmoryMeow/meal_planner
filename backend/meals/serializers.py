from decimal import Decimal

from rest_framework import serializers

from .models import Ingredient, Meal


class IngredientSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    class Meta:
        model = Ingredient
        fields = ("id", "name", "quantity", "unit")
        read_only_fields = ("id",)


class MealSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    ingredients = IngredientSerializer(many=True, read_only=True)

    class Meta:
        model = Meal
        fields = (
            "id",
            "name",
            "source",
            "tags",
            "ingredients",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "ingredients", "created_at", "updated_at")
