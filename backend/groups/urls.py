from django.urls import path

from .views import (
    GroupDetailView,
    GroupInviteDetailView,
    GroupInviteListCreateView,
    GroupListCreateView,
    GroupMemberDetailView,
    InviteAcceptView,
)

urlpatterns = [
    path("groups/", GroupListCreateView.as_view(), name="group-list"),
    path("groups/<int:pk>/", GroupDetailView.as_view(), name="group-detail"),
    path(
        "groups/<int:group_pk>/members/<int:pk>/",
        GroupMemberDetailView.as_view(),
        name="group-member-detail",
    ),
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
    path(
        "invites/<uuid:token>/accept/",
        InviteAcceptView.as_view(),
        name="invite-accept",
    ),
]
