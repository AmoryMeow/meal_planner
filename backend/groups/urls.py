from django.urls import path

from .views import (
    GroupDetailView,
    GroupInviteDetailView,
    GroupInviteListCreateView,
    GroupListCreateView,
)

urlpatterns = [
    path("groups/", GroupListCreateView.as_view(), name="group-list"),
    path("groups/<int:pk>/", GroupDetailView.as_view(), name="group-detail"),
    path(
        "groups/<int:group_pk>/invites/",
        GroupInviteListCreateView.as_view(),
        name="group-invite-list",
    ),
    path(
        "groups/<int:group_pk>/invites/<int:pk>/",
        GroupInviteDetailView.as_view(),
        name="group-invite-detail",
    ),
]
