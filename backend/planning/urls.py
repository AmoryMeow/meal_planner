from django.urls import path

from .views import (
    PersonalPlanView,
    PlanDetailView,
    PlanItemDetailView,
    PlanItemListCreateView,
    PlanListView,
)

urlpatterns = [
    path(
        "plan/",
        PersonalPlanView.as_view(),
        name="personal-plan-detail",
    ),
    path(
        "plans/",
        PlanListView.as_view(),
        name="plan-list",
    ),
    path(
        "plans/<int:pk>/",
        PlanDetailView.as_view(),
        name="plan-detail",
    ),
    path(
        "plan-items/",
        PlanItemListCreateView.as_view(),
        name="plan-item-list",
    ),
    path(
        "plan-items/<int:pk>/",
        PlanItemDetailView.as_view(),
        name="plan-item-detail",
    ),
]
