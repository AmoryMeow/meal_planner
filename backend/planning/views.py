from django.db.models import Case, IntegerField, Value, When

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Plan, PlanItem
from .serializers import PlanItemRangeSerializer, PlanItemSerializer
from .services import get_or_create_personal_plan


class PlanItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PlanItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_plan(self, *, create):
        if create:
            return get_or_create_personal_plan(self.request.user)
        return Plan.objects.filter(owner=self.request.user).first()

    def get_queryset(self):
        date_range = PlanItemRangeSerializer(data=self.request.query_params)
        date_range.is_valid(raise_exception=True)
        plan = self.get_plan(create=False)
        if plan is None:
            return PlanItem.objects.none()

        return (
            PlanItem.objects.filter(
                plan=plan,
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
        serializer.save(plan=self.get_plan(create=True))
