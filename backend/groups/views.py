from django.db.models import Case, Count, IntegerField, Prefetch, Value, When
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Group, Invite, Membership
from .permissions import GroupOwnerPermission, GroupPermission
from .serializers import GroupDetailSerializer, GroupSerializer, InviteSerializer
from .services import revoke_invite


def get_current_memberships(user):
    return Membership.objects.filter(user=user)


def get_member_queryset():
    return (
        Membership.objects.select_related("user")
        .alias(
            role_order=Case(
                When(role=Membership.Role.OWNER, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by("role_order", "id")
    )


class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return (
            Group.objects.annotate(member_total=Count("memberships", distinct=True))
            .filter(memberships__user=self.request.user)
            .select_related("plan")
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=get_current_memberships(self.request.user),
                    to_attr="current_user_memberships",
                )
            )
            .order_by("name", "id")
        )


class GroupDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = GroupDetailSerializer
    permission_classes = (IsAuthenticated, GroupPermission)

    def get_queryset(self):
        return (
            Group.objects.filter(memberships__user=self.request.user)
            .select_related("plan")
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=get_current_memberships(self.request.user),
                    to_attr="current_user_memberships",
                ),
                Prefetch(
                    "memberships",
                    queryset=get_member_queryset(),
                    to_attr="all_memberships",
                ),
            )
            .distinct()
        )


class GroupInviteMixin:
    permission_classes = (IsAuthenticated, GroupOwnerPermission)

    def get_group(self):
        if not hasattr(self, "_group"):
            group = get_object_or_404(
                Group.objects.filter(memberships__user=self.request.user)
                .prefetch_related(
                    Prefetch(
                        "memberships",
                        queryset=get_current_memberships(self.request.user),
                        to_attr="current_user_memberships",
                    )
                )
                .distinct(),
                pk=self.kwargs["group_pk"],
            )
            self.check_object_permissions(self.request, group)
            self._group = group
        return self._group

    def get_queryset(self):
        return Invite.objects.filter(
            group=self.get_group(),
            status=Invite.Status.PENDING,
        ).order_by("-created_at")


class GroupInviteListCreateView(GroupInviteMixin, generics.ListCreateAPIView):
    serializer_class = InviteSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "group": self.get_group(),
        }


class GroupInviteDetailView(GroupInviteMixin, generics.DestroyAPIView):
    serializer_class = InviteSerializer

    def perform_destroy(self, instance):
        revoke_invite(invite=instance)
