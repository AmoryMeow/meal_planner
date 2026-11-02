from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Membership


def get_group_role(user, group):
    if not user.is_authenticated:
        return None

    memberships = getattr(group, "current_user_memberships", None)
    if memberships is not None:
        return memberships[0].role if memberships else None

    return (
        Membership.objects.filter(group=group, user=user)
        .values_list("role", flat=True)
        .first()
    )


class GroupPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        role = get_group_role(request.user, obj)
        if request.method in SAFE_METHODS:
            return role is not None
        return role == Membership.Role.OWNER
