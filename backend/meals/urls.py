from django.urls import path

from rest_framework.routers import DefaultRouter

from .views import (
    IngredientCatalogViewSet,
    IngredientDetailView,
    IngredientListCreateView,
    MealViewSet,
)

router = DefaultRouter()
router.register("meals", MealViewSet, basename="meal")
router.register("ingredients", IngredientCatalogViewSet, basename="ingredient-catalog")

urlpatterns = [
    path(
        "meals/<int:meal_pk>/ingredients/",
        IngredientListCreateView.as_view(),
        name="ingredient-list",
    ),
    path(
        "meals/<int:meal_pk>/ingredients/<int:pk>/",
        IngredientDetailView.as_view(),
        name="ingredient-detail",
    ),
    *router.urls,
]
