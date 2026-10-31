from decimal import Decimal

from rest_framework import serializers

from .models import Ingredient, Meal, MealIngredient


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class MealIngredientSerializer(serializers.ModelSerializer):
    ingredient_id = serializers.IntegerField()
    name = serializers.CharField(source="ingredient.name", read_only=True)
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    class Meta:
        model = MealIngredient
        fields = ("id", "ingredient_id", "name", "quantity", "unit")
        read_only_fields = ("id",)

    def validate_ingredient_id(self, value):
        request = self.context.get("request")
        if (
            not request
            or not Ingredient.objects.filter(
                pk=value,
                owner=request.user,
            ).exists()
        ):
            raise serializers.ValidationError("Ingredient does not exist.")
        return value


class MealSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    ingredients = MealIngredientSerializer(many=True, read_only=True)

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
