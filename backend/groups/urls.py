from django.urls import path

from .views import GroupListCreateView

urlpatterns = [
    path("groups/", GroupListCreateView.as_view(), name="group-list"),
]
