from rest_framework import serializers

from meals.models import Meal

from .models import PlanItem
from .services import create_plan_item


class PlanItemRangeSerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError(
                "date_from must be earlier than or equal to date_to."
            )
        return attrs


class PlanItemSerializer(serializers.ModelSerializer):
    plan_id = serializers.IntegerField(read_only=True)
    meal_id = serializers.PrimaryKeyRelatedField(
        source="meal",
        queryset=Meal.objects.none(),
    )

    class Meta:
        model = PlanItem
        fields = (
            "id",
            "plan_id",
            "date",
            "meal_type",
            "meal_id",
            "servings",
            "note",
            "meal_snapshot",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "plan_id",
            "meal_snapshot",
            "created_at",
            "updated_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["meal_id"].queryset = Meal.objects.filter(owner=request.user)

    def create(self, validated_data):
        return create_plan_item(
            plan=validated_data.pop("plan"),
            meal=validated_data.pop("meal"),
            scheduled_date=validated_data.pop("date"),
            meal_type=validated_data.pop("meal_type"),
            **validated_data,
        )
