from django.db import transaction

from groups.models import Membership

from .models import MealShare


class MealShareServiceError(Exception):
    pass


class MealShareOwnershipError(MealShareServiceError):
    pass


class MealShareGroupMembershipError(MealShareServiceError):
    pass


class InvalidMealShareAccessError(MealShareServiceError):
    pass


@transaction.atomic
def share_meal(*, meal, group, actor, access=MealShare.Access.READ) -> MealShare:
    if meal.owner_id != actor.id:
        raise MealShareOwnershipError("Only the meal owner can manage sharing.")
    if not Membership.objects.filter(group=group, user=actor).exists():
        raise MealShareGroupMembershipError("The meal owner must belong to the group.")
    if access not in MealShare.Access.values:
        raise InvalidMealShareAccessError("Unsupported meal share access level.")

    share, _created = MealShare.objects.update_or_create(
        meal=meal,
        group=group,
        defaults={"access": access},
    )
    return share


@transaction.atomic
def revoke_meal_share(*, share: MealShare, actor) -> None:
    if share.meal.owner_id != actor.id:
        raise MealShareOwnershipError("Only the meal owner can manage sharing.")
    share.delete()
