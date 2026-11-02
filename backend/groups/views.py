from django.db.models import Count, Prefetch

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Group, Membership
from .serializers import GroupSerializer


class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        current_memberships = Membership.objects.filter(user=self.request.user)
        return (
            Group.objects.annotate(member_total=Count("memberships", distinct=True))
            .filter(memberships__user=self.request.user)
            .select_related("plan")
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=current_memberships,
                    to_attr="current_user_memberships",
                )
            )
            .order_by("name", "id")
        )
