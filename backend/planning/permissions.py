from django.db.models import Q

from rest_framework.permissions import SAFE_METHODS, BasePermission

from groups.models import Membership

from .models import Plan


def get_accessible_plans(user):
    if not user.is_authenticated:
        return Plan.objects.none()
    return Plan.objects.filter(
        Q(owner=user) | Q(group__memberships__user=user)
    ).distinct()


def is_plan_member(user, plan) -> bool:
    if not user.is_authenticated:
        return False
    if plan.owner_id is not None:
        return plan.owner_id == user.id
    return Membership.objects.filter(group_id=plan.group_id, user=user).exists()


def can_manage_plan(user, plan) -> bool:
    if not user.is_authenticated:
        return False
    if plan.owner_id is not None:
        return plan.owner_id == user.id
    return Membership.objects.filter(
        group_id=plan.group_id,
        user=user,
        role=Membership.Role.OWNER,
    ).exists()


class PlanPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return is_plan_member(request.user, obj)
        return can_manage_plan(request.user, obj)


class PlanItemPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        return is_plan_member(request.user, obj.plan)
