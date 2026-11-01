from django.urls import path

from .views import PlanItemDetailView, PlanItemListCreateView

urlpatterns = [
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
