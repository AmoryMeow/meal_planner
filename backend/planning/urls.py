from django.urls import path

from .views import PersonalPlanView, PlanItemDetailView, PlanItemListCreateView

urlpatterns = [
    path(
        "plan/",
        PersonalPlanView.as_view(),
        name="personal-plan-detail",
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
