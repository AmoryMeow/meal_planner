from django.db import transaction

from rest_framework import serializers

from meals.models import Meal, MealShare
from meals.permissions import get_readable_meals
from meals.services import share_meal

from .models import MealType, Plan, PlanItem
from .permissions import can_manage_plan, get_accessible_plans
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

    @transaction.atomic
    def update(self, instance, validated_data):
        updated_plan = super().update(instance, validated_data)
        if updated_plan.group_id is not None and (
            "name" in validated_data or "color" in validated_data
        ):
            group = updated_plan.group
            group.name = updated_plan.name
            group.color = updated_plan.color
            group.full_clean()
            group.save()
        return updated_plan


class PlanItemRangeSerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    plan_ids = serializers.CharField(required=False, allow_blank=False)

    def validate_plan_ids(self, value):
        try:
            plan_ids = [int(plan_id) for plan_id in value.split(",")]
        except ValueError as error:
            raise serializers.ValidationError(
                "Plan IDs must be positive integers separated by commas."
            ) from error
        if not plan_ids or any(plan_id <= 0 for plan_id in plan_ids):
            raise serializers.ValidationError(
                "Plan IDs must be positive integers separated by commas."
            )
        return list(dict.fromkeys(plan_ids))

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError(
                "date_from must be earlier than or equal to date_to."
            )
        return attrs


class PlanItemSerializer(serializers.ModelSerializer):
    plan_id = serializers.IntegerField(min_value=1, required=False)
    share_with_group = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )
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
            "share_with_group",
            "servings",
            "note",
            "meal_snapshot",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "meal_snapshot",
            "created_at",
            "updated_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["meal_id"].queryset = get_readable_meals(request.user)

    @transaction.atomic
    def create(self, validated_data):
        share_with_group = validated_data.pop("share_with_group", False)
        plan = validated_data.pop("plan")
        meal = validated_data.pop("meal")
        self._share_meal_with_plan_group(
            plan=plan,
            meal=meal,
            share_with_group=share_with_group,
        )
        return create_plan_item(
            plan=plan,
            meal=meal,
            scheduled_date=validated_data.pop("date"),
            meal_type=validated_data.pop("meal_type"),
            **validated_data,
        )

    def validate(self, attrs):
        plan_id = attrs.pop("plan_id", None)
        if self.instance is not None:
            if "meal" not in attrs:
                if attrs.get("share_with_group"):
                    raise serializers.ValidationError(
                        {
                            "share_with_group": (
                                "Select a meal before confirming group access."
                            )
                        }
                    )
                return attrs
            plan = self.instance.plan
        elif plan_id is None:
            self._validate_meal_access(
                plan=None,
                meal=attrs["meal"],
                share_with_group=attrs.get("share_with_group", False),
            )
            return attrs

        else:
            request = self.context.get("request")
            try:
                plan = get_accessible_plans(request.user).select_related("group").get(
                    pk=plan_id
                )
            except Plan.DoesNotExist as error:
                raise serializers.ValidationError(
                    {"plan_id": "Plan is not available."}
                ) from error
            attrs["plan"] = plan

        self._validate_meal_access(
            plan=plan,
            meal=attrs["meal"],
            share_with_group=attrs.get("share_with_group", False),
        )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        share_with_group = validated_data.pop("share_with_group", False)
        meal = validated_data.get("meal")
        if meal is not None:
            self._share_meal_with_plan_group(
                plan=instance.plan,
                meal=meal,
                share_with_group=share_with_group,
            )
        if meal is not None and meal.pk != instance.meal_id:
            validated_data["meal_snapshot"] = build_meal_snapshot(meal)

        return super().update(instance, validated_data)

    def _validate_meal_access(self, *, plan, meal, share_with_group):
        request = self.context["request"]
        if plan is None or plan.owner_id is not None:
            if meal.owner_id != request.user.id:
                raise serializers.ValidationError(
                    {"meal_id": "Meal is not available for the personal plan."}
                )
            if share_with_group:
                raise serializers.ValidationError(
                    {"share_with_group": "Personal plans do not have group access."}
                )
            return

        is_shared = MealShare.objects.filter(meal=meal, group=plan.group).exists()
        if is_shared:
            return
        if meal.owner_id != request.user.id or not share_with_group:
            raise serializers.ValidationError(
                {
                    "share_with_group": (
                        "Confirm sharing this meal with the selected group."
                    )
                }
            )

    def _share_meal_with_plan_group(self, *, plan, meal, share_with_group):
        if (
            not share_with_group
            or plan.group_id is None
            or MealShare.objects.filter(meal=meal, group=plan.group).exists()
        ):
            return
        share_meal(
            meal=meal,
            group=plan.group,
            actor=self.context["request"].user,
            access=MealShare.Access.READ,
        )
