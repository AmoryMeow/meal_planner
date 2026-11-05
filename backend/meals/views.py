from django.db.models import BooleanField, Case, Exists, OuterRef, Value, When
from django.shortcuts import get_object_or_404

from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, mixins, serializers, viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from .models import Ingredient, Meal, MealIngredient, MealShare, Tag, normalize_tag_name
from .permissions import MealPermission, get_editable_meals, get_readable_meals
from .serializers import (
    IngredientSerializer,
    MealIngredientSerializer,
    MealSerializer,
    MealShareSerializer,
    MealTagFilterOptionSerializer,
    TagSerializer,
)
from .services import revoke_meal_share


class IngredientCatalogViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Ingredient.objects.none()
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return Ingredient.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TagCatalogViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Tag.objects.none()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return Tag.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.none()
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
            .prefetch_related("ingredients__ingredient", "tags")
            .order_by("-updated_at", "-id")
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action != "list":
            return queryset

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        sources = self.request.query_params.getlist("source")
        invalid_sources = set(sources) - set(Meal.Source.values)
        if invalid_sources:
            raise serializers.ValidationError({"source": "Unsupported meal source."})
        if sources:
            queryset = queryset.filter(source__in=sources)

        access = self.request.query_params.get("access", "all")
        if access == "owned":
            queryset = queryset.filter(owner=self.request.user)
        elif access == "shared":
            queryset = queryset.exclude(owner=self.request.user)
        elif access != "all":
            raise serializers.ValidationError({"access": "Unsupported access filter."})

        for tag in self.request.query_params.getlist("tag"):
            normalized_tag = normalize_tag_name(tag)
            if normalized_tag:
                queryset = queryset.filter(tags__normalized_name=normalized_tag)

        ordering = self.request.query_params.get("ordering", "recent")
        if ordering == "name":
            queryset = queryset.order_by("name", "id")
        elif ordering == "recent":
            queryset = queryset.order_by("-updated_at", "-id")
        else:
            raise serializers.ValidationError({"ordering": "Unsupported ordering."})
        return queryset.distinct()

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


class MealTagCatalogView(generics.ListCreateAPIView):
    serializer_class = TagSerializer
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
        return Tag.objects.filter(owner=self.get_meal().owner)

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "tag_owner": self.get_meal().owner,
        }

    def perform_create(self, serializer):
        serializer.save(owner=self.get_meal().owner)


class MealTagFilterOptionsView(generics.GenericAPIView):
    serializer_class = MealTagFilterOptionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    @extend_schema(responses=MealTagFilterOptionSerializer(many=True))
    def get(self, request, *args, **kwargs):
        search = request.query_params.get("search", "").strip()
        tags = Tag.objects.filter(meals__in=get_readable_meals(request.user))
        if search:
            tags = tags.filter(name__icontains=search)

        options = {}
        for tag in tags.order_by("name", "id").iterator():
            options.setdefault(
                tag.normalized_name,
                {"value": tag.normalized_name, "label": tag.name},
            )
        return Response(list(options.values()))


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
