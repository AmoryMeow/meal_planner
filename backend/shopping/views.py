from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from planning.models import PlanItem
from planning.permissions import get_accessible_plans
from planning.serializers import PlanItemRangeSerializer

from .serializers import ShoppingListItemSerializer
from .services import build_shopping_list


class ShoppingListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[PlanItemRangeSerializer],
        responses=ShoppingListItemSerializer(many=True),
    )
    def get(self, request):
        query = PlanItemRangeSerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        plans = get_accessible_plans(request.user)
        plan_ids = query.validated_data.get("plan_ids")
        plans = (
            plans.filter(id__in=plan_ids)
            if plan_ids is not None
            else plans.filter(owner=request.user)
        )
        plan_items = (
            PlanItem.objects.filter(
                plan__in=plans,
                date__range=(
                    query.validated_data["date_from"],
                    query.validated_data["date_to"],
                ),
            )
            .select_related("meal")
            .prefetch_related("meal__ingredients__ingredient")
            .order_by("date", "id")
        )

        return Response(build_shopping_list(plan_items))
