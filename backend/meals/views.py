from django.shortcuts import get_object_or_404

from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Meal, MealIngredient
from .serializers import MealIngredientSerializer, MealSerializer


class MealViewSet(viewsets.ModelViewSet):
    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Meal.objects.filter(owner=self.request.user)
            .prefetch_related("ingredients__ingredient")
            .order_by("-created_at", "-id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class IngredientListCreateView(generics.ListCreateAPIView):
    serializer_class = MealIngredientSerializer
    permission_classes = [IsAuthenticated]

    def get_meal(self):
        return get_object_or_404(
            Meal,
            pk=self.kwargs["meal_pk"],
            owner=self.request.user,
        )

    def get_queryset(self):
        return (
            MealIngredient.objects.filter(meal=self.get_meal())
            .select_related("ingredient")
            .order_by("id")
        )

    def perform_create(self, serializer):
        serializer.save(meal=self.get_meal())


class IngredientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MealIngredientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MealIngredient.objects.filter(
            meal_id=self.kwargs["meal_pk"],
            meal__owner=self.request.user,
        ).select_related("ingredient")
