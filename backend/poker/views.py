from django.db.models import Prefetch
from django.shortcuts import get_object_or_404

from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meals.models import Meal, normalize_tag_name
from planning.serializers import PlanItemSerializer

from .models import PokerParticipant, PokerVote
from .permissions import get_accessible_sessions
from .serializers import (
    PokerCompleteSerializer,
    PokerMealSerializer,
    PokerSessionCreateSerializer,
    PokerSessionSerializer,
    PokerVoteSubmissionSerializer,
)
from .services import (
    PokerPermissionError,
    PokerServiceError,
    add_winner_to_plan,
    cancel_session,
    complete_session,
    join_session,
    reveal_results,
    start_voting,
    submit_votes,
)


def get_session_queryset(user):
    votes = PokerVote.objects.select_related("meal").order_by("priority", "id")
    participants = (
        PokerParticipant.objects.select_related("user", "session")
        .prefetch_related(Prefetch("votes", queryset=votes))
        .order_by("joined_at", "id")
    )
    return (
        get_accessible_sessions(user)
        .select_related("group", "organizer", "winner", "plan_item")
        .prefetch_related(Prefetch("participants", queryset=participants))
    )


def raise_service_error(error):
    if isinstance(error, PokerPermissionError):
        raise PermissionDenied(str(error)) from error
    raise ValidationError({"detail": str(error)}) from error


class PokerSessionListCreateView(generics.ListAPIView):
    serializer_class = PokerSessionSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return get_session_queryset(self.request.user)

    @extend_schema(
        request=PokerSessionCreateSerializer,
        responses={status.HTTP_201_CREATED: PokerSessionSerializer},
    )
    def post(self, request):
        serializer = PokerSessionCreateSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        session = get_session_queryset(request.user).get(pk=session.pk)
        return Response(
            PokerSessionSerializer(
                session,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_201_CREATED,
        )


class PokerSessionDetailView(generics.RetrieveAPIView):
    serializer_class = PokerSessionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return get_session_queryset(self.request.user)


class PokerSessionActionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_session(self):
        return get_object_or_404(
            get_accessible_sessions(self.request.user).select_related(
                "group__plan",
                "organizer",
                "winner",
                "plan_item",
            ),
            pk=self.kwargs["pk"],
        )

    def session_response(self, session):
        refreshed_session = get_session_queryset(self.request.user).get(pk=session.pk)
        return Response(
            PokerSessionSerializer(
                refreshed_session,
                context={"request": self.request},
            ).data
        )


class PokerSessionJoinView(PokerSessionActionView):
    @extend_schema(request=None, responses=PokerSessionSerializer)
    def post(self, request, pk):
        try:
            participant = join_session(session=self.get_session(), user=request.user)
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(participant.session)


class PokerSessionStartView(PokerSessionActionView):
    @extend_schema(request=None, responses=PokerSessionSerializer)
    def post(self, request, pk):
        try:
            session = start_voting(session=self.get_session(), actor=request.user)
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(session)


class PokerSessionVoteView(PokerSessionActionView):
    @extend_schema(
        request=PokerVoteSubmissionSerializer,
        responses=PokerSessionSerializer,
    )
    def put(self, request, pk):
        serializer = PokerVoteSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            participant = submit_votes(
                session=self.get_session(),
                user=request.user,
                ordered_meal_ids=serializer.validated_data["meal_ids"],
            )
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(participant.session)


class PokerSessionRevealView(PokerSessionActionView):
    @extend_schema(request=None, responses=PokerSessionSerializer)
    def post(self, request, pk):
        try:
            session = reveal_results(session=self.get_session(), actor=request.user)
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(session)


class PokerSessionCompleteView(PokerSessionActionView):
    @extend_schema(
        request=PokerCompleteSerializer,
        responses=PokerSessionSerializer,
    )
    def post(self, request, pk):
        serializer = PokerCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            session = complete_session(
                session=self.get_session(),
                actor=request.user,
                winner_id=serializer.validated_data.get("winner_id"),
            )
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(session)


class PokerSessionAddToPlanView(PokerSessionActionView):
    @extend_schema(request=None, responses=PlanItemSerializer)
    def post(self, request, pk):
        try:
            plan_item = add_winner_to_plan(
                session=self.get_session(),
                actor=request.user,
            )
        except PokerServiceError as error:
            raise_service_error(error)
        return Response(
            PlanItemSerializer(plan_item, context={"request": request}).data
        )


class PokerSessionCancelView(PokerSessionActionView):
    @extend_schema(request=None, responses=PokerSessionSerializer)
    def post(self, request, pk):
        try:
            session = cancel_session(session=self.get_session(), actor=request.user)
        except PokerServiceError as error:
            raise_service_error(error)
        return self.session_response(session)


class PokerSessionMealListView(generics.ListAPIView):
    serializer_class = PokerMealSerializer
    permission_classes = (IsAuthenticated,)

    def get_session(self):
        return get_object_or_404(
            get_accessible_sessions(self.request.user).select_related("group"),
            pk=self.kwargs["pk"],
        )

    def get_queryset(self):
        queryset = Meal.objects.filter(shares__group=self.get_session().group)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        sources = self.request.query_params.getlist("source")
        if set(sources) - set(Meal.Source.values):
            raise serializers.ValidationError({"source": "Unsupported meal source."})
        if sources:
            queryset = queryset.filter(source__in=sources)

        for tag in self.request.query_params.getlist("tag"):
            normalized_tag = normalize_tag_name(tag)
            if normalized_tag:
                queryset = queryset.filter(tags__normalized_name=normalized_tag)
        return queryset.distinct().order_by("name", "id")
