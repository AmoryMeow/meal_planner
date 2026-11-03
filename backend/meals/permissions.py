from django.db.models import Q

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Meal, MealShare


def get_readable_meals(user):
    if not user.is_authenticated:
        return Meal.objects.none()
    return Meal.objects.filter(
        Q(owner=user) | Q(shares__group__memberships__user=user)
    ).distinct()


def get_editable_meals(user):
    if not user.is_authenticated:
        return Meal.objects.none()
    return Meal.objects.filter(
        Q(owner=user)
        | Q(
            shares__access=MealShare.Access.EDIT,
            shares__group__memberships__user=user,
        )
    ).distinct()


def can_read_meal(user, meal: Meal) -> bool:
    if not user.is_authenticated:
        return False
    if meal.owner_id == user.id:
        return True
    return MealShare.objects.filter(
        meal=meal,
        group__memberships__user=user,
    ).exists()


def can_edit_meal(user, meal: Meal) -> bool:
    if not user.is_authenticated:
        return False
    if meal.owner_id == user.id:
        return True
    return MealShare.objects.filter(
        meal=meal,
        access=MealShare.Access.EDIT,
        group__memberships__user=user,
    ).exists()


class MealPermission(BasePermission):
    message = "You do not have access to this meal."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return can_read_meal(request.user, obj)
        if request.method in ("PUT", "PATCH"):
            return can_edit_meal(request.user, obj)
        return obj.owner_id == request.user.id
