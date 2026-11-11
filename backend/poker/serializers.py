from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from groups.models import Group
from meals.models import Meal
from planning.models import MealType

from .models import PokerParticipant, PokerSession, PokerVote
from .services import (
    PokerPermissionError,
    PokerSelectionError,
    calculate_results,
    create_session,
)


class PokerMealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = ("id", "name", "source")
        read_only_fields = fields


class PokerVoteSerializer(serializers.ModelSerializer):
    meal = PokerMealSerializer(read_only=True)

    class Meta:
        model = PokerVote
        fields = ("id", "priority", "meal")
        read_only_fields = fields


class PokerParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    votes = serializers.SerializerMethodField()

    class Meta:
        model = PokerParticipant
        fields = (
            "id",
            "user_id",
            "email",
            "first_name",
            "last_name",
            "is_ready",
            "votes",
            "joined_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(PokerVoteSerializer(many=True, allow_null=True))
    def get_votes(self, obj):
        request = self.context.get("request")
        can_see_votes = obj.session.status in (
            PokerSession.Status.REVEALED,
            PokerSession.Status.COMPLETED,
        ) or bool(request and obj.user_id == request.user.id)
        if not can_see_votes:
            return None
        return PokerVoteSerializer(
            obj.votes.all(),
            many=True,
            context=self.context,
        ).data


class PokerResultSerializer(serializers.Serializer):
    meal = PokerMealSerializer(read_only=True)
    score = serializers.IntegerField(min_value=1, read_only=True)
    first_place_votes = serializers.IntegerField(min_value=0, read_only=True)


class PokerSessionSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    group_color = serializers.CharField(source="group.color", read_only=True)
    organizer_id = serializers.IntegerField(read_only=True)
    organizer_email = serializers.EmailField(source="organizer.email", read_only=True)
    participants = PokerParticipantSerializer(many=True, read_only=True)
    participant_count = serializers.SerializerMethodField()
    has_joined = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    results = serializers.SerializerMethodField()
    winner = PokerMealSerializer(read_only=True, allow_null=True)
    plan_item_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = PokerSession
        fields = (
            "id",
            "group_id",
            "group_name",
            "group_color",
            "organizer_id",
            "organizer_email",
            "date",
            "meal_type",
            "status",
            "participant_count",
            "has_joined",
            "can_manage",
            "participants",
            "results",
            "winner",
            "plan_item_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(min_value=0))
    def get_participant_count(self, obj):
        return len(obj.participants.all())

    @extend_schema_field(serializers.BooleanField())
    def get_has_joined(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and any(
                participant.user_id == request.user.id
                for participant in obj.participants.all()
            )
        )

    @extend_schema_field(serializers.BooleanField())
    def get_can_manage(self, obj):
        request = self.context.get("request")
        return bool(request and obj.organizer_id == request.user.id)

    @extend_schema_field(PokerResultSerializer(many=True, allow_null=True))
    def get_results(self, obj):
        if obj.status not in (
            PokerSession.Status.REVEALED,
            PokerSession.Status.COMPLETED,
        ):
            return None
        return PokerResultSerializer(
            calculate_results(obj),
            many=True,
            context=self.context,
        ).data


class PokerSessionCreateSerializer(serializers.Serializer):
    group_id = serializers.PrimaryKeyRelatedField(
        source="group",
        queryset=Group.objects.none(),
    )
    date = serializers.DateField()
    meal_type = serializers.ChoiceField(choices=MealType.choices)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["group_id"].queryset = Group.objects.filter(
                memberships__user=request.user
            ).select_related("plan")

    def create(self, validated_data):
        try:
            return create_session(
                group=validated_data["group"],
                organizer=self.context["request"].user,
                scheduled_date=validated_data["date"],
                meal_type=validated_data["meal_type"],
            )
        except (PokerPermissionError, PokerSelectionError) as error:
            raise serializers.ValidationError({"detail": str(error)}) from error


class PokerVoteSubmissionSerializer(serializers.Serializer):
    meal_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1,
        max_length=3,
    )

    def validate_meal_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Each selected meal must be unique.")
        return value


class PokerCompleteSerializer(serializers.Serializer):
    winner_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
