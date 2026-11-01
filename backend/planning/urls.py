from django.urls import path

from .views import PlanItemListCreateView

urlpatterns = [
    path(
        "plan-items/",
        PlanItemListCreateView.as_view(),
        name="plan-item-list",
    ),
]
