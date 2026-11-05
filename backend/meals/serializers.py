from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from groups.models import Group

from .models import (
    Ingredient,
    Meal,
    MealIngredient,
    MealShare,
    Tag,
    normalize_ingredient_name,
    normalize_tag_name,
)
from .permissions import can_edit_meal
from .services import MealShareServiceError, share_meal


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        name = " ".join(value.split())
        request = self.context.get("request")
        ingredient_owner = self.context.get("ingredient_owner")
        if ingredient_owner is None and self.instance is not None:
            ingredient_owner = self.instance.owner
        if ingredient_owner is None and request:
            ingredient_owner = request.user
        if ingredient_owner is None:
            return name

        ingredients = Ingredient.objects.filter(
            owner=ingredient_owner,
            normalized_name=normalize_ingredient_name(name),
        )
        if self.instance:
            ingredients = ingredients.exclude(pk=self.instance.pk)
        if ingredients.exists():
            raise serializers.ValidationError("Ingredient already exists.")
        return name


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        name = " ".join(value.split())
        request = self.context.get("request")
        tag_owner = self.context.get("tag_owner")
        if tag_owner is None and self.instance is not None:
            tag_owner = self.instance.owner
        if tag_owner is None and request:
            tag_owner = request.user
        if tag_owner is None:
            return name

        tags = Tag.objects.filter(
            owner=tag_owner,
            normalized_name=normalize_tag_name(name),
        )
        if self.instance:
            tags = tags.exclude(pk=self.instance.pk)
        if tags.exists():
            raise serializers.ValidationError("Tag already exists.")
        return name


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
        meal = self.context.get("meal")
        ingredient_owner = (
            meal.owner if meal is not None else getattr(request, "user", None)
        )
        if (
            ingredient_owner is None
            or not Ingredient.objects.filter(
                pk=value,
                owner=ingredient_owner,
            ).exists()
        ):
            raise serializers.ValidationError("Ingredient does not exist.")
        return value


class MealSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    ingredients = MealIngredientSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = (
            "id",
            "name",
            "source",
            "servings",
            "tags",
            "tag_ids",
            "instructions",
            "ingredients",
            "is_owner",
            "can_edit",
            "can_delete",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "ingredients",
            "is_owner",
            "can_edit",
            "can_delete",
            "created_at",
            "updated_at",
        )

    @extend_schema_field(serializers.BooleanField())
    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and obj.owner_id == request.user.id)

    @extend_schema_field(serializers.BooleanField())
    def get_can_edit(self, obj):
        annotated_access = getattr(obj, "user_can_edit", None)
        if annotated_access is not None:
            return annotated_access
        request = self.context.get("request")
        return bool(request and can_edit_meal(request.user, obj))

    @extend_schema_field(serializers.BooleanField())
    def get_can_delete(self, obj):
        return self.get_is_owner(obj)

    def validate_tag_ids(self, value):
        tag_ids = list(dict.fromkeys(value))
        tags = self._get_tags(tag_ids)
        if len(tags) != len(tag_ids):
            raise serializers.ValidationError("One or more tags do not exist.")
        return tag_ids

    def create(self, validated_data):
        tag_ids = validated_data.pop("tag_ids", [])
        meal = super().create(validated_data)
        meal.tags.set(self._get_tags(tag_ids))
        return meal

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop("tag_ids", None)
        meal = super().update(instance, validated_data)
        if tag_ids is not None:
            meal.tags.set(self._get_tags(tag_ids))
        return meal

    def _get_tags(self, tag_ids):
        request = self.context.get("request")
        owner = self.instance.owner if self.instance is not None else request.user
        return list(Tag.objects.filter(owner=owner, id__in=tag_ids))


class MealTagFilterOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class MealShareSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(required=False)
    group_name = serializers.CharField(source="group.name", read_only=True)
    group_color = serializers.CharField(source="group.color", read_only=True)

    class Meta:
        model = MealShare
        fields = (
            "id",
            "group_id",
            "group_name",
            "group_color",
            "access",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "group_name",
            "group_color",
            "created_at",
            "updated_at",
        )

    def validate_group_id(self, value):
        request = self.context.get("request")
        group = (
            Group.objects.filter(pk=value, memberships__user=request.user)
            .distinct()
            .first()
            if request
            else None
        )
        if group is None:
            raise serializers.ValidationError("Group does not exist.")
        if self.instance and self.instance.group_id != group.id:
            raise serializers.ValidationError("Group cannot be changed.")

        meal = self.context.get("meal")
        if (
            self.instance is None
            and meal
            and MealShare.objects.filter(meal=meal, group=group).exists()
        ):
            raise serializers.ValidationError("Meal is already shared with this group.")

        self.validated_group = group
        return value

    def validate(self, attrs):
        if self.instance is None and "group_id" not in attrs:
            raise serializers.ValidationError({"group_id": "This field is required."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("group_id")
        return self.save_share(
            group=self.validated_group,
            access=validated_data.get("access", MealShare.Access.READ),
        )

    def update(self, instance, validated_data):
        validated_data.pop("group_id", None)
        return self.save_share(
            group=instance.group,
            access=validated_data.get("access", instance.access),
        )

    def save_share(self, *, group, access):
        try:
            return share_meal(
                meal=self.context["meal"],
                group=group,
                actor=self.context["request"].user,
                access=access,
            )
        except MealShareServiceError as error:
            raise serializers.ValidationError({"detail": str(error)}) from error
