from django.db.models import Case, IntegerField, Q, Value, When

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Plan, PlanItem
from .permissions import PlanItemPermission, PlanPermission, get_accessible_plans
from .serializers import PlanItemRangeSerializer, PlanItemSerializer, PlanSerializer
from .services import get_or_create_personal_plan


class PersonalPlanView(generics.RetrieveUpdateAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_or_create_personal_plan(self.request.user)


class PlanListView(generics.ListAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        get_or_create_personal_plan(self.request.user)
        return (
            Plan.objects.filter(
                Q(owner=self.request.user)
                | Q(group__memberships__user=self.request.user)
            )
            .select_related("group")
            .distinct()
            .alias(
                scope_order=Case(
                    When(owner=self.request.user, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            .order_by("scope_order", "id")
        )


class PlanDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, PlanPermission]

    def get_queryset(self):
        return (
            Plan.objects.filter(
                Q(owner=self.request.user)
                | Q(group__memberships__user=self.request.user)
            )
            .select_related("group")
            .distinct()
        )


class PlanItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PlanItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        date_range = PlanItemRangeSerializer(data=self.request.query_params)
        date_range.is_valid(raise_exception=True)
        plans = get_accessible_plans(self.request.user)
        plan_ids = date_range.validated_data.get("plan_ids")
        plans = (
            plans.filter(id__in=plan_ids)
            if plan_ids is not None
            else plans.filter(owner=self.request.user)
        )

        return (
            PlanItem.objects.filter(
                plan__in=plans,
                date__range=(
                    date_range.validated_data["date_from"],
                    date_range.validated_data["date_to"],
                ),
            )
            .select_related("plan", "meal")
            .alias(
                meal_type_order=Case(
                    When(meal_type=PlanItem.MealType.BREAKFAST, then=Value(1)),
                    When(meal_type=PlanItem.MealType.LUNCH, then=Value(2)),
                    When(meal_type=PlanItem.MealType.DINNER, then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                )
            )
            .order_by("date", "meal_type_order", "id")
        )

    def perform_create(self, serializer):
        if "plan" in serializer.validated_data:
            serializer.save()
            return
        serializer.save(plan=get_or_create_personal_plan(self.request.user))


class PlanItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlanItemSerializer
    permission_classes = [IsAuthenticated, PlanItemPermission]

    def get_queryset(self):
        return PlanItem.objects.filter(
            plan__in=get_accessible_plans(self.request.user)
        ).select_related(
            "plan",
            "plan__group",
            "meal",
        )
