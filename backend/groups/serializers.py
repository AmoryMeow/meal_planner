from rest_framework import serializers

from .models import Group
from .services import create_group


class GroupSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    plan_id = serializers.IntegerField(source="plan.id", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = (
            "id",
            "name",
            "color",
            "role",
            "plan_id",
            "member_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def get_role(self, obj):
        memberships = getattr(obj, "current_user_memberships", None)
        if memberships is not None:
            return memberships[0].role if memberships else None

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None

    def get_member_count(self, obj):
        annotated_count = getattr(obj, "member_total", None)
        return (
            annotated_count if annotated_count is not None else obj.memberships.count()
        )

    def create(self, validated_data):
        return create_group(owner=self.context["request"].user, **validated_data)
