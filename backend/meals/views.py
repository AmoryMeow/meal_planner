from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Meal
from .serializers import MealSerializer


class MealViewSet(viewsets.ModelViewSet):
    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Meal.objects.filter(owner=self.request.user)
            .prefetch_related("ingredients")
            .order_by("-created_at", "-id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
