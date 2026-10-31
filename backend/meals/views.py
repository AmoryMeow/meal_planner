from django.shortcuts import get_object_or_404

from rest_framework import filters, generics, mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Ingredient, Meal, MealIngredient
from .serializers import IngredientSerializer, MealIngredientSerializer, MealSerializer


class IngredientCatalogViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return Ingredient.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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
