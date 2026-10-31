from django.urls import path

from rest_framework.routers import DefaultRouter

from .views import IngredientDetailView, IngredientListCreateView, MealViewSet

router = DefaultRouter()
router.register("meals", MealViewSet, basename="meal")

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
