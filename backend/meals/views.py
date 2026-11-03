from django.db.models import BooleanField, Case, Exists, OuterRef, Value, When
from django.shortcuts import get_object_or_404

from rest_framework import filters, generics, mixins, viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from .models import Ingredient, Meal, MealIngredient, MealShare
from .permissions import MealPermission, get_editable_meals, get_readable_meals
from .serializers import (
    IngredientSerializer,
    MealIngredientSerializer,
    MealSerializer,
    MealShareSerializer,
)
from .services import revoke_meal_share


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
    permission_classes = [IsAuthenticated, MealPermission]

    def get_queryset(self):
        if self.action == "destroy":
            meals = Meal.objects.filter(owner=self.request.user)
        elif self.action in ("update", "partial_update"):
            meals = get_editable_meals(self.request.user)
        else:
            meals = get_readable_meals(self.request.user)

        editable_shares = MealShare.objects.filter(
            meal_id=OuterRef("pk"),
            access=MealShare.Access.EDIT,
            group__memberships__user=self.request.user,
        )
        return (
            meals.annotate(
                user_can_edit=Case(
                    When(owner=self.request.user, then=Value(True)),
                    default=Exists(editable_shares),
                    output_field=BooleanField(),
                )
            )
            .prefetch_related("ingredients__ingredient")
            .order_by("-created_at", "-id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MealShareMixin:
    serializer_class = MealShareSerializer
    permission_classes = [IsAuthenticated]

    def get_meal(self):
        if not hasattr(self, "_meal"):
            self._meal = get_object_or_404(
                Meal,
                pk=self.kwargs["meal_pk"],
                owner=self.request.user,
            )
        return self._meal

    def get_queryset(self):
        return (
            MealShare.objects.filter(meal=self.get_meal())
            .select_related("group")
            .order_by("group__name", "group_id")
        )

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "meal": self.get_meal(),
        }


class MealShareListCreateView(MealShareMixin, generics.ListCreateAPIView):
    pagination_class = None


class MealShareDetailView(MealShareMixin, generics.RetrieveUpdateDestroyAPIView):
    def perform_destroy(self, instance):
        revoke_meal_share(share=instance, actor=self.request.user)


class MealIngredientAccessMixin:
    serializer_class = MealIngredientSerializer
    permission_classes = [IsAuthenticated]

    def get_meal(self):
        if not hasattr(self, "_meal"):
            meals = (
                get_readable_meals(self.request.user)
                if self.request.method in SAFE_METHODS
                else get_editable_meals(self.request.user)
            )
            self._meal = get_object_or_404(
                meals.select_related("owner"),
                pk=self.kwargs["meal_pk"],
            )
        return self._meal

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "meal": self.get_meal(),
        }


class MealIngredientCatalogView(generics.ListCreateAPIView):
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_meal(self):
        if not hasattr(self, "_meal"):
            self._meal = get_object_or_404(
                get_editable_meals(self.request.user).select_related("owner"),
                pk=self.kwargs["meal_pk"],
            )
        return self._meal

    def get_queryset(self):
        return Ingredient.objects.filter(owner=self.get_meal().owner)

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "ingredient_owner": self.get_meal().owner,
        }

    def perform_create(self, serializer):
        serializer.save(owner=self.get_meal().owner)


class IngredientListCreateView(
    MealIngredientAccessMixin,
    generics.ListCreateAPIView,
):
    def get_queryset(self):
        return (
            MealIngredient.objects.filter(meal=self.get_meal())
            .select_related("ingredient")
            .order_by("id")
        )

    def perform_create(self, serializer):
        serializer.save(meal=self.get_meal())


class IngredientDetailView(
    MealIngredientAccessMixin,
    generics.RetrieveUpdateDestroyAPIView,
):
    def get_queryset(self):
        return MealIngredient.objects.filter(meal=self.get_meal()).select_related(
            "ingredient"
        )
