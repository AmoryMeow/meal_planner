from rest_framework import serializers

from meals.models import Meal

from .models import MealType, Plan, PlanItem
from .permissions import can_manage_plan
from .services import build_meal_snapshot, create_plan_item


class PlanSerializer(serializers.ModelSerializer):
    scope = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(read_only=True, allow_null=True)
    can_manage = serializers.SerializerMethodField()
    enabled_meal_types = serializers.ListField(
        child=serializers.ChoiceField(choices=MealType.choices),
        allow_empty=False,
    )

    class Meta:
        model = Plan
        fields = (
            "id",
            "scope",
            "group_id",
            "can_manage",
            "name",
            "color",
            "enabled_meal_types",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def get_scope(self, obj):
        return "group" if obj.group_id is not None else "personal"

    def get_can_manage(self, obj):
        request = self.context.get("request")
        return bool(request and can_manage_plan(request.user, obj))

    def validate_enabled_meal_types(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Meal sections must not contain duplicates."
            )
        return value


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

    def update(self, instance, validated_data):
        meal = validated_data.get("meal")
        if meal is not None and meal.pk != instance.meal_id:
            validated_data["meal_snapshot"] = build_meal_snapshot(meal)

        return super().update(instance, validated_data)
