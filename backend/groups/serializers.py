from rest_framework import serializers

from .models import Group, Invite, Membership
from .permissions import get_group_role
from .services import InviteServiceError, create_group, create_invite, update_group


class GroupMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = Membership
        fields = (
            "id",
            "user_id",
            "email",
            "first_name",
            "last_name",
            "role",
            "created_at",
        )
        read_only_fields = fields


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
        request = self.context.get("request")
        return get_group_role(request.user, obj) if request else None

    def get_member_count(self, obj):
        annotated_count = getattr(obj, "member_total", None)
        return (
            annotated_count if annotated_count is not None else obj.memberships.count()
        )

    def create(self, validated_data):
        return create_group(owner=self.context["request"].user, **validated_data)

    def update(self, instance, validated_data):
        return update_group(
            group=instance,
            name=validated_data.get("name", instance.name),
            color=validated_data.get("color", instance.color),
        )


class GroupDetailSerializer(GroupSerializer):
    members = GroupMemberSerializer(source="all_memberships", many=True, read_only=True)

    class Meta(GroupSerializer.Meta):
        fields = (*GroupSerializer.Meta.fields, "members")


class InviteSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invite
        fields = (
            "id",
            "email",
            "token",
            "status",
            "is_expired",
            "expires_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "token",
            "status",
            "is_expired",
            "expires_at",
            "created_at",
        )

    def create(self, validated_data):
        try:
            return create_invite(
                group=self.context["group"],
                invited_by=self.context["request"].user,
                **validated_data,
            )
        except InviteServiceError as error:
            raise serializers.ValidationError({"email": [str(error)]}) from error
